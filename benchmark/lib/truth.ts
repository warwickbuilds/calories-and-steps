/**
 * Turns the filled-in sheets into ground truth.
 *
 * meals.csv has one row per weighed component. The meal's photo and
 * description go on its first row (later rows can leave them blank):
 *   meal, photo, description, item, grams, cal_per_100, protein_per_100, carbs_per_100, fat_per_100
 * Instead of the per-100 columns, a row can give `calories` (and protein,
 * carbs, fat in grams) for the amount eaten, e.g. a packaged bar.
 *
 * labels.csv has one row per nutrition-panel photo, with the per-100 g
 * (or per-100 ml) numbers typed from the panel:
 *   photo, cal_per_100, protein_per_100, carbs_per_100, fat_per_100
 */

export type Macros = { calories: number; protein: number | null; carbs: number | null; fat: number | null };

export type TruthMeal = Macros & {
  id: string;
  photo: string | null;
  description: string;
  items: { name: string; grams: number; calories: number }[];
};

export type TruthLabel = Macros & { photo: string };

const num = (s: string | undefined): number | null => {
  if (s == null || s.trim() === '') return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const KJ_PER_CALORIE = 4.184;

/** A per-100 value may be typed as calories, or in kJ with a "kJ" suffix. */
function caloriesPer100(s: string | undefined): number | null {
  const n = num(s);
  if (n == null) return null;
  return /kj/i.test(s ?? '') ? n / KJ_PER_CALORIE : n;
}

export function mealsFromRows(rows: Record<string, string>[]): { meals: TruthMeal[]; problems: string[] } {
  const problems: string[] = [];
  const byId = new Map<string, TruthMeal>();
  const missing = { protein: new Set<string>(), carbs: new Set<string>(), fat: new Set<string>() };
  rows.forEach((r, i) => {
    const line = i + 2;
    const id = r.meal;
    if (!id) {
      problems.push(`meals.csv line ${line}: no meal id`);
      return;
    }
    let meal = byId.get(id);
    if (!meal) {
      meal = {
        id,
        photo: null,
        description: '',
        items: [],
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      byId.set(id, meal);
    }
    if (r.photo) meal.photo = r.photo;
    if (r.description) meal.description = r.description;
    if (!r.item && !r.grams && !r.calories && !r.cal_per_100) return; // a header-only row for the meal

    const grams = num(r.grams);
    const per100 = caloriesPer100(r.cal_per_100);
    const direct = num(r.calories);
    let calories: number;
    const macro = (perKey: string, directKey: string): number | null => {
      if (direct != null && per100 == null) return num(r[directKey]);
      const p = num(r[perKey]);
      return p == null || grams == null ? null : (p * grams) / 100;
    };
    if (direct != null && per100 == null) calories = direct;
    else if (per100 != null && grams != null) calories = (per100 * grams) / 100;
    else {
      problems.push(`meals.csv line ${line} (${id}, ${r.item || 'item'}): needs grams and cal_per_100, or calories`);
      return;
    }
    meal.items.push({ name: r.item || 'item', grams: grams ?? 0, calories });
    meal.calories += calories;
    for (const [k, perKey, directKey] of [
      ['protein', 'protein_per_100', 'protein'],
      ['carbs', 'carbs_per_100', 'carbs'],
      ['fat', 'fat_per_100', 'fat'],
    ] as const) {
      const v = macro(perKey, directKey);
      if (v == null) missing[k].add(id);
      else if (meal[k] != null) meal[k] = (meal[k] as number) + v;
    }
  });
  const meals = [...byId.values()];
  for (const m of meals) {
    for (const k of ['protein', 'carbs', 'fat'] as const) if (missing[k].has(m.id)) m[k] = null;
    if (m.items.length === 0) problems.push(`meal ${m.id}: no weighed items`);
    if (!m.photo && !m.description) problems.push(`meal ${m.id}: needs a photo or a description`);
  }
  return { meals: meals.filter((m) => m.items.length > 0), problems };
}

export function labelsFromRows(rows: Record<string, string>[]): { labels: TruthLabel[]; problems: string[] } {
  const problems: string[] = [];
  const labels: TruthLabel[] = [];
  rows.forEach((r, i) => {
    const calories = caloriesPer100(r.cal_per_100);
    if (!r.photo || calories == null) {
      problems.push(`labels.csv line ${i + 2}: needs photo and cal_per_100`);
      return;
    }
    labels.push({
      photo: r.photo,
      calories,
      protein: num(r.protein_per_100),
      carbs: num(r.carbs_per_100),
      fat: num(r.fat_per_100),
    });
  });
  return { labels, problems };
}
