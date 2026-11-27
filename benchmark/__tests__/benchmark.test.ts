import { parseCsv, toCsv } from '../lib/csv';
import { costUsd, geminiUsage } from '../lib/pricing';
import { markdownReport, pctError, pickDefault, summarise, type Trial } from '../lib/score';
import { labelsFromRows, mealsFromRows } from '../lib/truth';

describe('parseCsv', () => {
  it('reads quotes, commas inside quotes, CRLF and a BOM', () => {
    const rows = parseCsv('﻿Meal,Description,Grams\r\nm1,"Rice, chicken and ""sauce""",250\r\n\r\nm2,,10\r\n');
    expect(rows).toEqual([
      { meal: 'm1', description: 'Rice, chicken and "sauce"', grams: '250' },
      { meal: 'm2', description: '', grams: '10' },
    ]);
  });

  it('round-trips through toCsv', () => {
    const text = toCsv([['a', 'b'], ['x, y', 'say "hi"']]);
    expect(parseCsv(text)).toEqual([{ a: 'x, y', b: 'say "hi"' }]);
  });
});

describe('mealsFromRows', () => {
  it('sums weighed items from per-100 values and direct calories', () => {
    const { meals, problems } = mealsFromRows(
      parseCsv(
        [
          'meal,photo,description,item,grams,cal_per_100,protein_per_100,carbs_per_100,fat_per_100,calories,protein,carbs,fat',
          'm1,m1.jpg,chicken and rice,cooked rice,200,130,2.7,28,0.3,,,,',
          'm1,,,chicken breast,150,165,31,0,3.6,,,,',
          'm1,,,olive oil,10,884,0,0,100,,,,',
          'm2,m2.jpg,protein bar,bar,60,,,,,220,20,22,7',
        ].join('\n'),
      ),
    );
    expect(problems).toEqual([]);
    const m1 = meals.find((m) => m.id === 'm1')!;
    expect(m1.calories).toBeCloseTo(260 + 247.5 + 88.4);
    expect(m1.protein).toBeCloseTo(5.4 + 46.5);
    expect(m1.fat).toBeCloseTo(0.6 + 5.4 + 10);
    expect(m1.photo).toBe('m1.jpg');
    expect(m1.items).toHaveLength(3);
    expect(meals.find((m) => m.id === 'm2')!.calories).toBe(220);
  });

  it('accepts kJ per 100 and leaves a macro unknown when any item lacks it', () => {
    const { meals } = mealsFromRows(
      parseCsv('meal,photo,item,grams,cal_per_100,protein_per_100\nm1,a.jpg,yoghurt,100,418 kJ,5\nm1,,honey,20,304,'),
    );
    expect(meals[0].calories).toBeCloseTo(100 + 60.8, 0);
    expect(meals[0].protein).toBeNull();
  });

  it('reports rows it cannot use', () => {
    const { meals, problems } = mealsFromRows(parseCsv('meal,photo,item,grams,cal_per_100\nm1,a.jpg,rice,,130\n,,x,1,1'));
    expect(meals).toEqual([]);
    expect(problems.join(' ')).toMatch(/line 2/);
    expect(problems.join(' ')).toMatch(/line 3: no meal id/);
  });
});

describe('labelsFromRows', () => {
  it('reads label truth', () => {
    const { labels, problems } = labelsFromRows(parseCsv('photo,cal_per_100,protein_per_100\nl1.jpg,1500kJ,10\nl2.jpg,,'));
    expect(labels).toEqual([{ photo: 'l1.jpg', calories: 1500 / 4.184, protein: 10, carbs: null, fat: null }]);
    expect(problems).toHaveLength(1);
  });
});

const trial = (over: Partial<Trial>): Trial => ({
  model: 'a',
  condition: 'photo+voice',
  case: 'm1',
  run: 1,
  trueCalories: 500,
  trueProtein: 30,
  trueCarbs: 50,
  trueFat: 20,
  calories: 500,
  protein: 30,
  carbs: 50,
  fat: 20,
  latencyMs: 1000,
  costUsd: 0.001,
  error: null,
  ...over,
});

describe('summarise', () => {
  it('works out error, bias, spread and failures per model and condition', () => {
    const [s] = summarise([
      trial({ calories: 400, fat: 10 }),
      trial({ run: 2, calories: 450 }),
      trial({ case: 'm2', calories: 600 }),
      trial({ case: 'm2', run: 2, calories: null, error: 'timeout' }),
    ]);
    expect(s.n).toBe(4);
    expect(s.failures).toBe(1);
    expect(s.mape).toBeCloseTo((20 + 10 + 20) / 3);
    expect(s.bias).toBeCloseTo((-20 - 10 + 20) / 3);
    expect(s.within10).toBeCloseTo(100 / 3);
    expect(s.within20).toBe(100);
    expect(s.fatMae).toBeCloseTo(10 / 3);
    expect(s.spread).toBeCloseTo(10); // m1 moved 50 calories on a 500 truth
    expect(s.costPer100Usd).toBeCloseTo(0.1);
  });

  it('floors tiny truths so a black coffee cannot dominate', () => {
    expect(pctError(20, 5)).toBeCloseTo(30);
  });
});

describe('pickDefault', () => {
  const sums = summarise([
    trial({ model: 'pricey', calories: 520, costUsd: 0.01 }),
    trial({ model: 'cheap', calories: 535, costUsd: 0.001 }),
    trial({ model: 'flaky', calories: 500, costUsd: 0.0001 }),
    trial({ model: 'flaky', run: 2, calories: null, error: 'x' }),
  ]);
  it('prefers the cheaper model when it is within 2 points, and skips flaky ones', () => {
    expect(pickDefault(sums, 'photo+voice')!.model).toBe('pricey'); // cheap is 7 % vs 4 %
    expect(pickDefault(sums, 'photo+voice', 3.5)!.model).toBe('cheap');
  });

  it('writes a report with a table per condition', () => {
    const md = markdownReport(sums, { date: '2026-11-27', meals: 1, labels: 0, runs: 2 });
    expect(md).toContain('Meals: photo and description');
    expect(md).toContain('| cheap | 7.0% |');
    expect(md).not.toContain('kcal');
  });
});

describe('pricing', () => {
  it('counts thinking tokens as output', () => {
    const usage = geminiUsage({ usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 300, thoughtsTokenCount: 700 } });
    expect(usage).toEqual({ input: 1000, output: 1000 });
    expect(costUsd('gemini-3.1-flash-lite', usage)).toBeCloseTo((1000 * 0.25 + 1000 * 1.5) / 1e6);
    expect(costUsd('unknown-model', usage)).toBeNull();
  });
});

describe('example sheets', () => {
  const read = (f: string) => require('node:fs').readFileSync(require('node:path').join(__dirname, '..', f), 'utf8');
  it('parse with no problems', () => {
    const meals = mealsFromRows(parseCsv(read('meals.example.csv')));
    expect(meals.problems).toEqual([]);
    expect(meals.meals.map((m) => m.id)).toEqual(['m01', 'm02']);
    const labels = labelsFromRows(parseCsv(read('labels.example.csv')));
    expect(labels.problems).toEqual([]);
    expect(labels.labels).toHaveLength(2);
  });
});
