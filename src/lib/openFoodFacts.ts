/**
 * Barcode lookups in Open Food Facts (https://world.openfoodfacts.org), a
 * free, open food database (ODbL). No key is needed. Results are cached in the
 * food_ref table, so each product is fetched once.
 */

import { scaleNutrition, type Nutrition } from './food';

export interface Per100g {
  name: string;
  brand: string | null;
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  /** Grams in one serving, when the product says. */
  servingG: number | null;
}

const KJ_PER_CALORIE = 4.184;

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};

const round1 = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

/** Valid EAN-13, EAN-8, UPC-A or UPC-E digits (length only; scanners already check the digit). */
export const isBarcode = (code: string) => /^\d{8}$|^\d{12,14}$/.test(code);

/**
 * Turns an Open Food Facts v2 product response into per-100 g numbers.
 * Returns null when the product is missing or has no calorie figure.
 */
export function parseOffProduct(json: any): Per100g | null {
  if (!json || json.status === 0 || !json.product) return null;
  const p = json.product;
  const n = p.nutriments ?? {};
  let calories = num(n['energy-kcal_100g']);
  if (calories == null) {
    const kj = num(n['energy-kj_100g']) ?? (n['energy_unit'] === 'kcal' ? null : num(n['energy_100g']));
    if (kj != null) calories = kj / KJ_PER_CALORIE;
  }
  if (calories == null) return null;
  const name = String(p.product_name || p.generic_name || '').trim();
  const brand = String(p.brands || '').split(',')[0].trim();
  const serving = num(p.serving_quantity);
  return {
    name: name || 'Unnamed product',
    brand: brand || null,
    caloriesPer100g: Math.round(calories),
    proteinPer100g: round1(num(n.proteins_100g)),
    carbsPer100g: round1(num(n.carbohydrates_100g)),
    fatPer100g: round1(num(n.fat_100g)),
    servingG: serving && serving > 0 && serving < 5000 ? serving : null,
  };
}

/** What `grams` of a per-100 g food comes to. */
export function nutritionFor(food: Omit<Per100g, 'name' | 'brand' | 'servingG'>, grams: number): Nutrition {
  return scaleNutrition(
    {
      calories: food.caloriesPer100g,
      proteinG: food.proteinPer100g,
      carbsG: food.carbsPer100g,
      fatG: food.fatPer100g,
      grams: 100,
    },
    grams / 100,
  );
}

/** "Brand Name" without repeating the brand when the name already starts with it. */
export function displayName(food: Pick<Per100g, 'name' | 'brand'>): string {
  if (!food.brand || food.name.toLowerCase().startsWith(food.brand.toLowerCase())) return food.name;
  return `${food.brand} ${food.name}`;
}

export const OFF_FIELDS = 'product_name,generic_name,brands,nutriments,serving_quantity';

export function offUrl(barcode: string) {
  return `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`;
}

export type LookupResult = { kind: 'found'; food: Per100g } | { kind: 'not-found' } | { kind: 'offline' };

/** Looks a barcode up. Open Food Facts asks apps to name themselves in the User-Agent. */
export async function lookupBarcode(barcode: string, appVersion: string, signal?: AbortSignal): Promise<LookupResult> {
  let res: Response;
  try {
    res = await fetch(offUrl(barcode), {
      headers: { 'User-Agent': `CaloriesAndSteps/${appVersion} (Android; github.com/warwickbuilds/calories-and-steps)` },
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    return { kind: 'offline' };
  }
  if (res.status === 404) return { kind: 'not-found' };
  if (!res.ok) return { kind: 'offline' };
  const food = parseOffProduct(await res.json().catch(() => null));
  return food ? { kind: 'found', food } : { kind: 'not-found' };
}
