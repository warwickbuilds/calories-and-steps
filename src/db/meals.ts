import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import type { FoodUnit } from '@/lib/food';
import type { MealType } from '@/lib/today';

import { db } from './client';
import { foodItem, meal } from './schema';

export const recentItemsQuery = (limit = 400) =>
  db
    .select({
      name: foodItem.name,
      grams: foodItem.grams,
      unit: foodItem.unit,
      calories: foodItem.calories,
      proteinG: foodItem.proteinG,
      carbsG: foodItem.carbsG,
      fatG: foodItem.fatG,
      eatenAt: meal.eatenAt,
    })
    .from(foodItem)
    .innerJoin(meal, eq(foodItem.mealId, meal.id))
    .orderBy(desc(meal.eatenAt))
    .limit(limit);

/** Calories per day between two local dates (inclusive). */
export const dailyCaloriesQuery = (fromDay: string, toDay: string) =>
  db
    .select({ day: meal.day, calories: sql<number>`sum(${foodItem.calories})`.as('calories') })
    .from(foodItem)
    .innerJoin(meal, eq(foodItem.mealId, meal.id))
    .where(and(gte(meal.day, fromDay), lte(meal.day, toDay)))
    .groupBy(meal.day);

export const foodItemQuery = (id: number) =>
  db
    .select({
      id: foodItem.id,
      name: foodItem.name,
      grams: foodItem.grams,
      unit: foodItem.unit,
      calories: foodItem.calories,
      proteinG: foodItem.proteinG,
      carbsG: foodItem.carbsG,
      fatG: foodItem.fatG,
      mealId: foodItem.mealId,
      mealType: meal.mealType,
      day: meal.day,
    })
    .from(foodItem)
    .innerJoin(meal, eq(foodItem.mealId, meal.id))
    .where(eq(foodItem.id, id));

export type FoodValues = {
  name: string;
  grams?: number | null;
  /** What `grams` is measured in. Grams when left out. */
  unit?: FoodUnit;
  calories: number;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  /** How sure the AI was; only set for AI estimates. */
  confidence?: 'low' | 'medium' | 'high' | null;
};

/** Logs one food as its own meal entry (a picked recent food, a quick add, a scanned product). */
export async function addFood(input: {
  day: string;
  mealType: MealType;
  source?: 'manual' | 'barcode' | 'panel' | 'photo';
  food: FoodValues;
  foodRefId?: number | null;
}) {
  await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(meal)
      .values({
        day: input.day,
        eatenAt: eatenAtFor(input.day),
        mealType: input.mealType,
        source: input.source ?? 'manual',
      })
      .returning({ id: meal.id });
    await tx.insert(foodItem).values({ mealId: m.id, ...nullable(input.food), foodRefId: input.foodRefId ?? null });
  });
}

/** Logs a meal of several items at once (an AI estimate), keeping what was said and the model's answer. */
export async function addMeal(input: {
  day: string;
  mealType: MealType;
  source: 'photo' | 'manual';
  items: FoodValues[];
  voiceText?: string | null;
  aiModel?: string | null;
  aiRawJson?: string | null;
}) {
  if (input.items.length === 0) return;
  await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(meal)
      .values({
        day: input.day,
        eatenAt: eatenAtFor(input.day),
        mealType: input.mealType,
        source: input.source,
        voiceText: input.voiceText || null,
        aiModel: input.aiModel ?? null,
        aiRawJson: input.aiRawJson ?? null,
      })
      .returning({ id: meal.id });
    await tx.insert(foodItem).values(input.items.map((f) => ({ mealId: m.id, ...nullable(f) })));
  });
}

/**
 * Saves edits to a logged item. Changing the meal moves the item into a new
 * meal entry on the same day, and removes the old entry if it is left empty.
 */
export async function updateFoodItem(id: number, food: FoodValues, mealType: MealType) {
  const [current] = await foodItemQuery(id);
  if (!current) return;
  await db.transaction(async (tx) => {
    let mealId = current.mealId;
    if (mealType !== current.mealType) {
      const [m] = await tx
        .insert(meal)
        .values({ day: current.day, eatenAt: eatenAtFor(current.day), mealType, source: 'manual' })
        .returning({ id: meal.id });
      mealId = m.id;
    }
    await tx
      .update(foodItem)
      .set({ ...nullable(food), mealId })
      .where(eq(foodItem.id, id));
    if (mealId !== current.mealId) {
      const left = await tx.select({ id: foodItem.id }).from(foodItem).where(eq(foodItem.mealId, current.mealId));
      if (left.length === 0) await tx.delete(meal).where(eq(meal.id, current.mealId));
    }
  });
}

const nullable = (f: FoodValues) => ({
  name: f.name,
  grams: f.grams ?? null,
  unit: f.unit ?? 'g',
  calories: f.calories,
  proteinG: f.proteinG ?? null,
  carbsG: f.carbsG ?? null,
  fatG: f.fatG ?? null,
  ...(f.confidence !== undefined ? { confidence: f.confidence } : {}),
});

/** Now for today; midday for another day, so past entries sort sensibly. */
function eatenAtFor(day: string): string {
  const now = new Date();
  const [y, m, d] = day.split('-').map(Number);
  if (now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d) return now.toISOString();
  return new Date(y, m - 1, d, 12).toISOString();
}

/** Copies every item logged for this meal on `fromDay` into `toDay`. Returns items copied. */
export async function copyMeal(mealType: MealType, fromDay: string, toDay: string): Promise<number> {
  const source = await db.query.meal.findMany({
    where: and(eq(meal.day, fromDay), eq(meal.mealType, mealType)),
  });
  if (source.length === 0) return 0;
  const items: (typeof foodItem.$inferSelect)[] = [];
  for (const m of source) {
    items.push(...(await db.select().from(foodItem).where(eq(foodItem.mealId, m.id))));
  }
  if (items.length === 0) return 0;
  await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(meal)
      .values({ day: toDay, eatenAt: eatenAtFor(toDay), mealType, source: 'manual' })
      .returning({ id: meal.id });
    await tx.insert(foodItem).values(
      items.map(({ id: _id, mealId: _mealId, ...rest }) => ({ ...rest, mealId: m.id })),
    );
  });
  return items.length;
}

export async function deleteFoodItem(id: number) {
  const [row] = await db.delete(foodItem).where(eq(foodItem.id, id)).returning({ mealId: foodItem.mealId });
  if (!row) return;
  const left = await db.select({ id: foodItem.id }).from(foodItem).where(eq(foodItem.mealId, row.mealId));
  if (left.length === 0) await db.delete(meal).where(eq(meal.id, row.mealId));
}
