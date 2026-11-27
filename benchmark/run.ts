/**
 * Runs the AI accuracy benchmark: every model × every meal × each way of
 * logging (photo, photo + description, description only), plus the
 * nutrition labels, using the app's own prompts, schemas and parsers.
 *
 *   cd benchmark && npm install
 *   GEMINI_API_KEY=... npm run bench -- --data "G:/My Drive/meal-benchmark"
 *
 * Answers are saved as they arrive (results/answers.jsonl in the data
 * folder), so a run that stops can be started again and only does what's
 * missing, and `--score-only` re-scores without calling the AI.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

import { mealEstimateRequest, parseMealAnswer, totalOf } from '../src/lib/ai/mealEstimate';
import { nutritionLabelRequest, parseLabelAnswer } from '../src/lib/ai/nutritionLabel';
import { buildRequest, errorForStatus, extractText, parseJsonLoose, type AiImage } from '../src/lib/ai/providers';
import { parseCsv, toCsv } from './lib/csv';
import { costUsd, geminiUsage } from './lib/pricing';
import { MEAL_CONDITIONS, markdownReport, summarise, type Condition, type Trial } from './lib/score';
import { labelsFromRows, mealsFromRows } from './lib/truth';

const DEFAULT_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-4-hydrogen'];

function args() {
  const a = process.argv.slice(2);
  const get = (name: string) => {
    const i = a.indexOf(`--${name}`);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return {
    data: get('data') ?? '.',
    models: (get('models') ?? DEFAULT_MODELS.join(',')).split(',').map((s) => s.trim()).filter(Boolean),
    runs: Number(get('runs') ?? 2),
    concurrency: Number(get('concurrency') ?? 3),
    conditions: (get('conditions')?.split(',') as Condition[] | undefined) ?? [...MEAL_CONDITIONS, 'label'],
    limit: get('limit') ? Number(get('limit')) : Infinity,
    scoreOnly: a.includes('--score-only'),
    yes: a.includes('--yes'),
  };
}

/** Same shrink as the app (src/lib/ai/prepareImage.ts): at most 1080 px wide, JPEG at 85%. */
async function loadImage(path: string): Promise<AiImage> {
  const buf = await sharp(path).rotate().resize({ width: 1080, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  return { mimeType: 'image/jpeg', base64: buf.toString('base64') };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Calls Gemini once, retrying rate limits and 5xx with backoff. Returns the parsed JSON, tokens and time. */
async function callGemini(model: string, apiKey: string, req: ReturnType<typeof mealEstimateRequest>) {
  const http = buildRequest('gemini', model, apiKey, req);
  for (let attempt = 0; ; attempt++) {
    const started = Date.now();
    const res = await fetch(http.url, { method: 'POST', headers: http.headers, body: JSON.stringify(http.body) });
    const latencyMs = Date.now() - started;
    const body: any = await res.json().catch(() => null);
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (!res.ok) throw errorForStatus('gemini', res.status, body?.error?.message?.slice(0, 200));
    return { answer: parseJsonLoose(extractText('gemini', body)), usage: geminiUsage(body), latencyMs };
  }
}

async function listModels(apiKey: string): Promise<Set<string> | null> {
  try {
    const names = new Set<string>();
    let page = '';
    do {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${page ? `&pageToken=${page}` : ''}`,
        { headers: { 'x-goog-api-key': apiKey } },
      );
      if (!res.ok) return null;
      const body: any = await res.json();
      for (const m of body.models ?? []) names.add(String(m.name).replace(/^models\//, ''));
      page = body.nextPageToken ?? '';
    } while (page);
    return names;
  } catch {
    return null;
  }
}

type Job = { model: string; condition: Condition; case: string; run: number; go: () => Promise<Trial> };

async function main() {
  const opt = args();
  const mealsPath = join(opt.data, 'meals.csv');
  const labelsPath = join(opt.data, 'labels.csv');
  const outDir = join(opt.data, 'results');
  const answersPath = join(outDir, 'answers.jsonl');
  mkdirSync(outDir, { recursive: true });

  const mealSheet = existsSync(mealsPath) ? mealsFromRows(parseCsv(readFileSync(mealsPath, 'utf8'))) : { meals: [], problems: [] };
  const labelSheet = existsSync(labelsPath) ? labelsFromRows(parseCsv(readFileSync(labelsPath, 'utf8'))) : { labels: [], problems: [] };
  const meals = mealSheet.meals.slice(0, opt.limit);
  const labels = labelSheet.labels.slice(0, opt.limit);
  for (const p of [...mealSheet.problems, ...labelSheet.problems]) console.warn(`! ${p}`);
  for (const m of meals) if (m.photo && !existsSync(join(opt.data, m.photo))) console.warn(`! meal ${m.id}: photo ${m.photo} not found`);
  for (const l of labels) if (!existsSync(join(opt.data, l.photo))) console.warn(`! label photo ${l.photo} not found`);
  console.log(`${meals.length} meals, ${labels.length} labels in ${opt.data}`);

  const done = new Map<string, Trial>();
  if (existsSync(answersPath)) {
    for (const line of readFileSync(answersPath, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const t: Trial = JSON.parse(line);
      if (!t.error) done.set(`${t.model}|${t.condition}|${t.case}|${t.run}`, t);
    }
  }

  if (!opt.scoreOnly) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Set GEMINI_API_KEY first (your Google AI Studio key).');
    const available = await listModels(apiKey);
    const models = opt.models.filter((m) => {
      if (available && !available.has(m)) {
        console.warn(`! ${m} isn't offered to this key, skipping it`);
        return false;
      }
      return true;
    });

    const jobs: Job[] = [];
    const imageCache = new Map<string, Promise<AiImage>>();
    const image = (file: string) => {
      if (!imageCache.has(file)) imageCache.set(file, loadImage(join(opt.data, file)));
      return imageCache.get(file)!;
    };
    for (const model of models) {
      for (let run = 1; run <= opt.runs; run++) {
        for (const condition of opt.conditions) {
          if (condition === 'label') {
            for (const l of labels) {
              jobs.push({
                model, condition, case: l.photo, run,
                go: async () => {
                  const r = await callGemini(model, apiKey, nutritionLabelRequest(await image(l.photo)));
                  const p = parseLabelAnswer(r.answer);
                  return {
                    model, condition, case: l.photo, run,
                    trueCalories: l.calories, trueProtein: l.protein, trueCarbs: l.carbs, trueFat: l.fat,
                    calories: p?.caloriesPer100g ?? null, protein: p?.proteinPer100g ?? null,
                    carbs: p?.carbsPer100g ?? null, fat: p?.fatPer100g ?? null,
                    latencyMs: r.latencyMs, costUsd: costUsd(model, r.usage), error: p ? null : 'not read as a label',
                  };
                },
              });
            }
            continue;
          }
          for (const m of meals) {
            const usePhoto = condition !== 'voice';
            const useWords = condition !== 'photo';
            if ((usePhoto && !m.photo) || (useWords && !m.description)) continue;
            jobs.push({
              model, condition, case: m.id, run,
              go: async () => {
                const req = mealEstimateRequest({
                  image: usePhoto ? await image(m.photo!) : null,
                  description: useWords ? m.description : '',
                });
                const r = await callGemini(model, apiKey, req);
                const est = parseMealAnswer(r.answer);
                const t = est ? totalOf(est.items) : null;
                return {
                  model, condition, case: m.id, run,
                  trueCalories: m.calories, trueProtein: m.protein, trueCarbs: m.carbs, trueFat: m.fat,
                  calories: t?.calories ?? null, protein: t?.proteinG ?? null, carbs: t?.carbsG ?? null, fat: t?.fatG ?? null,
                  latencyMs: r.latencyMs, costUsd: costUsd(model, r.usage), error: est ? null : 'no usable estimate',
                };
              },
            });
          }
        }
      }
    }
    const todo = jobs.filter((j) => !done.has(`${j.model}|${j.condition}|${j.case}|${j.run}`));
    console.log(`${jobs.length} calls in total, ${todo.length} still to do (${models.join(', ')}; ${opt.runs} run(s)).`);
    if (todo.length > 0 && !opt.yes && process.stdin.isTTY) {
      process.stdout.write('Start? [y/N] ');
      const answer = await new Promise<string>((r) => process.stdin.once('data', (d) => r(String(d))));
      process.stdin.pause();
      if (!/^y/i.test(answer.trim())) return;
    }

    let next = 0;
    let finished = 0;
    const worker = async () => {
      while (next < todo.length) {
        const job = todo[next++];
        let trial: Trial;
        const started = Date.now();
        try {
          trial = await job.go();
        } catch (e) {
          const truth = job.condition === 'label' ? labels.find((l) => l.photo === job.case)! : meals.find((m) => m.id === job.case)!;
          trial = {
            model: job.model, condition: job.condition, case: job.case, run: job.run,
            trueCalories: truth.calories, trueProtein: truth.protein, trueCarbs: truth.carbs, trueFat: truth.fat,
            calories: null, protein: null, carbs: null, fat: null,
            latencyMs: Date.now() - started, costUsd: null, error: (e as Error).message,
          };
          if ((e as { kind?: string }).kind === 'auth') throw e;
        }
        appendFileSync(answersPath, JSON.stringify(trial) + '\n');
        if (!trial.error) done.set(`${trial.model}|${trial.condition}|${trial.case}|${trial.run}`, trial);
        finished++;
        const shown = trial.calories == null ? `failed: ${trial.error}` : `${Math.round(trial.calories)} vs ${Math.round(trial.trueCalories)}`;
        console.log(`[${finished}/${todo.length}] ${trial.model} ${trial.condition} ${trial.case} #${trial.run}: ${shown}`);
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, opt.concurrency) }, worker));
  }

  // Score everything saved (failed calls count against their model).
  const all: Trial[] = [];
  const seen = new Set<string>();
  const lines = existsSync(answersPath) ? readFileSync(answersPath, 'utf8').split('\n').filter((l) => l.trim()) : [];
  for (const line of lines.reverse()) {
    const t: Trial = JSON.parse(line);
    const key = `${t.model}|${t.condition}|${t.case}|${t.run}`;
    if (seen.has(key)) continue; // newest answer wins, so a retried failure replaces the old one
    seen.add(key);
    all.push(t);
  }
  const summaries = summarise(all);
  const date = new Date().toISOString().slice(0, 10);
  const report = markdownReport(summaries, { date, meals: meals.length, labels: labels.length, runs: opt.runs });
  writeFileSync(join(outDir, 'report.md'), report);
  writeFileSync(
    join(outDir, 'per-answer.csv'),
    toCsv([
      ['model', 'condition', 'case', 'run', 'true_calories', 'calories', 'error_pct', 'protein', 'true_protein', 'carbs', 'true_carbs', 'fat', 'true_fat', 'latency_ms', 'cost_usd', 'error'],
      ...all.map((t) => [
        t.model, t.condition, t.case, t.run, Math.round(t.trueCalories), t.calories,
        t.calories == null ? null : Math.round(((t.calories - t.trueCalories) / Math.max(t.trueCalories, 50)) * 1000) / 10,
        t.protein, t.trueProtein, t.carbs, t.trueCarbs, t.fat, t.trueFat, t.latencyMs, t.costUsd, t.error,
      ]),
    ]),
  );
  console.log(`\n${report}\nSaved ${join(outDir, 'report.md')} and per-answer.csv`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
