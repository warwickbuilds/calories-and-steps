import { and, desc, eq, gte, lt } from 'drizzle-orm';

import { importTimestamp } from '@/lib/weightImport';

import { db } from './client';
import { foodItem, meal, profile, weightEntry, type NewProfile } from './schema';

export const PROFILE_ID = 1;

export const profileQuery = () => db.select().from(profile).where(eq(profile.id, PROFILE_ID));

export const latestWeightQuery = () =>
  db.select().from(weightEntry).orderBy(desc(weightEntry.measuredAt)).limit(1);

export const allWeightsQuery = () => db.select().from(weightEntry).orderBy(desc(weightEntry.measuredAt));

export const dayItemsQuery = (day: string) =>
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
      mealType: meal.mealType,
    })
    .from(foodItem)
    .innerJoin(meal, eq(foodItem.mealId, meal.id))
    .where(eq(meal.day, day))
    .orderBy(meal.eatenAt);

export async function saveProfile(values: Omit<NewProfile, 'id' | 'createdAt' | 'updatedAt'>) {
  await db
    .insert(profile)
    .values({ ...values, id: PROFILE_ID })
    .onConflictDoUpdate({
      target: profile.id,
      set: { ...values, updatedAt: new Date().toISOString() },
    });
}

export async function updateProfile(values: Partial<Omit<NewProfile, 'id' | 'createdAt'>>) {
  await db
    .update(profile)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(eq(profile.id, PROFILE_ID));
}

export async function addWeight(weightKg: number, measuredAt: Date = new Date()) {
  await db.insert(weightEntry).values({ weightKg, measuredAt: measuredAt.toISOString() });
}

/**
 * Logs today's weight. If a manual entry already exists between the given
 * local-day bounds, it is updated instead of adding a second one.
 */
export async function logWeightForDay(weightKg: number, dayStart: Date, dayEnd: Date) {
  const existing = await db
    .select({ id: weightEntry.id })
    .from(weightEntry)
    .where(
      and(
        gte(weightEntry.measuredAt, dayStart.toISOString()),
        lt(weightEntry.measuredAt, dayEnd.toISOString()),
        eq(weightEntry.source, 'manual'),
      ),
    )
    .orderBy(desc(weightEntry.measuredAt))
    .limit(1);
  if (existing.length > 0) {
    await db.update(weightEntry).set({ weightKg }).where(eq(weightEntry.id, existing[0].id));
  } else {
    await addWeight(weightKg);
  }
}

export async function deleteWeight(id: number) {
  await db.delete(weightEntry).where(eq(weightEntry.id, id));
}

/**
 * Saves the rows ticked on the import review screen in one transaction.
 * Rows for a date that already has a weight replace that weight; the rest
 * are added at midday on their date.
 */
export async function importWeights(
  rows: { day: string; kg: number; existingId: number | null }[],
): Promise<{ added: number; replaced: number }> {
  let added = 0;
  let replaced = 0;
  await db.transaction(async (tx) => {
    const fresh = rows.filter((r) => r.existingId == null);
    for (const r of rows) {
      if (r.existingId != null) {
        await tx.update(weightEntry).set({ weightKg: r.kg }).where(eq(weightEntry.id, r.existingId));
        replaced++;
      }
    }
    // Insert in chunks to stay under SQLite's variable limit on big imports.
    for (let i = 0; i < fresh.length; i += 200) {
      const chunk = fresh.slice(i, i + 200);
      await tx.insert(weightEntry).values(
        chunk.map((r) => ({ weightKg: r.kg, measuredAt: importTimestamp(r.day), source: 'import' as const })),
      );
      added += chunk.length;
    }
  });
  return { added, replaced };
}
