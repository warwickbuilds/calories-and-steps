import { desc, eq } from 'drizzle-orm';

import type { Per100g } from '@/lib/openFoodFacts';

import { db } from './client';
import { foodRef } from './schema';

export type FoodRef = typeof foodRef.$inferSelect;

/** The cached product for a barcode, newest first if somehow saved twice. */
export async function findByBarcode(barcode: string): Promise<FoodRef | null> {
  const rows = await db.select().from(foodRef).where(eq(foodRef.barcode, barcode)).orderBy(desc(foodRef.id)).limit(1);
  return rows[0] ?? null;
}

export async function getFoodRef(id: number): Promise<FoodRef | null> {
  const rows = await db.select().from(foodRef).where(eq(foodRef.id, id));
  return rows[0] ?? null;
}

/**
 * Saves a product (from Open Food Facts, a label read, or the user's edits)
 * and returns its id. A barcode that is already cached is updated in place.
 */
export async function saveFoodRef(food: Per100g, source: 'off' | 'panel' | 'custom', barcode: string | null): Promise<number> {
  const values = {
    name: food.name,
    brand: food.brand,
    caloriesPer100g: food.caloriesPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    servingG: food.servingG,
    unit: food.unit,
    category: food.category ?? null,
    source,
    barcode,
  };
  const existing = barcode ? await findByBarcode(barcode) : null;
  if (existing) {
    await db.update(foodRef).set(values).where(eq(foodRef.id, existing.id));
    return existing.id;
  }
  const [row] = await db.insert(foodRef).values(values).returning({ id: foodRef.id });
  return row.id;
}
