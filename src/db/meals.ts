import { and, eq } from 'drizzle-orm';

import type { MealType } from '@/lib/today';

import { db } from './client';
import { foodItem, meal } from './schema';

export async function quickAdd(input: {
  day: string;
  mealType: MealType;
  name: string;
  calories: number;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
}) {
  await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(meal)
      .values({
        day: input.day,
        eatenAt: new Date().toISOString(),
        mealType: input.mealType,
        source: 'manual',
      })
      .returning({ id: meal.id });
    await tx.insert(foodItem).values({
      mealId: m.id,
      name: input.name,
      calories: input.calories,
      proteinG: input.proteinG ?? null,
      carbsG: input.carbsG ?? null,
      fatG: input.fatG ?? null,
    });
  });
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
      .values({ day: toDay, eatenAt: new Date().toISOString(), mealType, source: 'manual' })
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
