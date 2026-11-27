/**
 * Scores model answers against the weighed truth and summarises them per
 * model and condition. Pure, so it is unit tested and can re-score saved
 * answers without calling the AI again.
 */

export type Condition = 'photo' | 'photo+voice' | 'voice' | 'label';

export const MEAL_CONDITIONS: Condition[] = ['photo', 'photo+voice', 'voice'];

/** One model answer for one meal (or label) in one run. */
export type Trial = {
  model: string;
  condition: Condition;
  case: string;
  run: number;
  trueCalories: number;
  trueProtein: number | null;
  trueCarbs: number | null;
  trueFat: number | null;
  /** The model's estimate, or null if the call failed or gave nothing usable. */
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  latencyMs: number;
  costUsd: number | null;
  error: string | null;
};

export type Summary = {
  model: string;
  condition: Condition;
  n: number;
  failures: number;
  /** Mean absolute percentage error of calories. */
  mape: number;
  medianApe: number;
  /** Mean signed % error: negative means the model under-counts. */
  bias: number;
  within10: number;
  within20: number;
  /** Mean absolute error in grams, over answers where the truth has the macro. */
  proteinMae: number | null;
  carbsMae: number | null;
  fatMae: number | null;
  /** How much the same case moves between runs: mean of per-case (max − min) / truth, as %. */
  spread: number | null;
  medianLatencyMs: number;
  costPer100Usd: number | null;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Signed % error. Truth is floored at 50 calories so a black coffee can't explode the average. */
export const pctError = (estimate: number, truth: number) => ((estimate - truth) / Math.max(truth, 50)) * 100;

type NumKey = 'protein' | 'carbs' | 'fat';
const TRUE_KEY = { protein: 'trueProtein', carbs: 'trueCarbs', fat: 'trueFat' } as const;

function mae(trials: Trial[], key: NumKey): number | null {
  const errs: number[] = [];
  for (const t of trials) {
    const est = t[key];
    const truth = t[TRUE_KEY[key]];
    if (est != null && truth != null) errs.push(Math.abs(est - truth));
  }
  return errs.length ? mean(errs) : null;
}

export function summarise(trials: Trial[]): Summary[] {
  const groups = new Map<string, Trial[]>();
  for (const t of trials) {
    const key = `${t.model}|${t.condition}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const out: Summary[] = [];
  for (const group of groups.values()) {
    const ok = group.filter((t) => t.calories != null);
    const errs = ok.map((t) => pctError(t.calories as number, t.trueCalories));
    const abs = errs.map(Math.abs);
    const byCase = new Map<string, Trial[]>();
    for (const t of ok) byCase.set(t.case, [...(byCase.get(t.case) ?? []), t]);
    const spreads = [...byCase.values()]
      .filter((ts) => ts.length > 1)
      .map((ts) => {
        const cs = ts.map((t) => t.calories as number);
        return ((Math.max(...cs) - Math.min(...cs)) / Math.max(ts[0].trueCalories, 50)) * 100;
      });
    const costs = group.map((t) => t.costUsd).filter((c): c is number => c != null);
    out.push({
      model: group[0].model,
      condition: group[0].condition,
      n: group.length,
      failures: group.length - ok.length,
      mape: mean(abs),
      medianApe: median(abs),
      bias: mean(errs),
      within10: ok.length ? (abs.filter((e) => e <= 10).length / ok.length) * 100 : NaN,
      within20: ok.length ? (abs.filter((e) => e <= 20).length / ok.length) * 100 : NaN,
      proteinMae: mae(ok, 'protein'),
      carbsMae: mae(ok, 'carbs'),
      fatMae: mae(ok, 'fat'),
      spread: spreads.length ? mean(spreads) : null,
      medianLatencyMs: median(group.map((t) => t.latencyMs)),
      costPer100Usd: costs.length ? mean(costs) * 100 : null,
    });
  }
  const order = (c: Condition) => ['photo+voice', 'photo', 'voice', 'label'].indexOf(c);
  return out.sort((a, b) => order(a.condition) - order(b.condition) || a.mape - b.mape);
}

/**
 * Suggests a default: the lowest error, unless a cheaper model is within
 * `tolerance` percentage points of it, in which case the cheapest of those.
 * A model with more than 5% failed calls is left out.
 */
export function pickDefault(summaries: Summary[], condition: Condition, tolerance = 2): Summary | null {
  const pool = summaries.filter((s) => s.condition === condition && Number.isFinite(s.mape) && s.failures / s.n <= 0.05);
  if (!pool.length) return null;
  const best = Math.min(...pool.map((s) => s.mape));
  const close = pool.filter((s) => s.mape <= best + tolerance);
  // Only trade accuracy for price when both prices are known.
  return close.sort((a, b) =>
    a.costPer100Usd != null && b.costPer100Usd != null ? a.costPer100Usd - b.costPer100Usd || a.mape - b.mape : a.mape - b.mape,
  )[0];
}

const f = (n: number | null, digits = 1) => (n == null || !Number.isFinite(n) ? '–' : n.toFixed(digits));

const TITLES: Record<Condition, string> = {
  'photo+voice': 'Meals: photo and description (how most meals are logged)',
  photo: 'Meals: photo only',
  voice: 'Meals: description only',
  label: 'Nutrition labels: calories per 100 g',
};

export function markdownReport(summaries: Summary[], meta: { date: string; meals: number; labels: number; runs: number }) {
  const lines: string[] = [];
  lines.push(`# AI accuracy benchmark, ${meta.date}`, '');
  lines.push(`${meta.meals} weighed meals and ${meta.labels} nutrition labels, ${meta.runs} run(s) of each.`, '');
  lines.push(
    'Errors are against the weighed truth. **MAPE** is the mean absolute % error in calories. **Bias** is the mean signed error (negative means it under-counts). **±10%** and **±20%** are the share of answers that close to the truth. **Spread** is how far the same meal moves between runs. Protein, carbs and fat are mean grams off. Cost is US$ per 100 estimates.',
    '',
  );
  const conditions = [...new Set(summaries.map((s) => s.condition))];
  for (const c of conditions) {
    lines.push(`## ${TITLES[c]}`, '');
    lines.push('| Model | MAPE | Median | Bias | ±10% | ±20% | Protein | Carbs | Fat | Spread | Latency | Cost/100 | Failed |');
    lines.push('| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |');
    for (const s of summaries.filter((x) => x.condition === c)) {
      const bias = Number.isFinite(s.bias) && s.bias > 0 ? `+${f(s.bias)}` : f(s.bias);
      const cost = s.costPer100Usd == null ? '–' : `$${s.costPer100Usd.toFixed(2)}`;
      lines.push(
        `| ${s.model} | ${f(s.mape)}% | ${f(s.medianApe)}% | ${bias}% | ${f(s.within10, 0)}% | ${f(s.within20, 0)}% | ${f(s.proteinMae)} g | ${f(s.carbsMae)} g | ${f(s.fatMae)} g | ${f(s.spread)}% | ${f(s.medianLatencyMs / 1000)} s | ${cost} | ${s.failures}/${s.n} |`,
      );
    }
    const pick = pickDefault(summaries, c);
    if (pick) lines.push('', `Suggested default: **${pick.model}** (lowest error, or the cheapest within 2 points of it where prices are known).`);
    lines.push('');
  }
  return lines.join('\n');
}
