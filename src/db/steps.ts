import { and, asc, eq, gte, lte } from 'drizzle-orm';

import type { StepDay } from '@/lib/steps';

import { db } from './client';
import { stepsDay } from './schema';

export const STEPS_SOURCE_HEALTH_CONNECT = 'health_connect';

export const stepsRangeQuery = (from: string, to: string) =>
  db
    .select({ day: stepsDay.date, steps: stepsDay.steps })
    .from(stepsDay)
    .where(and(gte(stepsDay.date, from), lte(stepsDay.date, to)))
    .orderBy(asc(stepsDay.date));

export const stepsForDayQuery = (day: string) =>
  db.select({ day: stepsDay.date, steps: stepsDay.steps }).from(stepsDay).where(eq(stepsDay.date, day));

/** Saves synced days, replacing what was there (Health Connect's total is always the latest). */
export async function saveStepDays(days: StepDay[], source = STEPS_SOURCE_HEALTH_CONNECT) {
  if (days.length === 0) return;
  const updatedAt = new Date().toISOString();
  await db.transaction(async (tx) => {
    for (const d of days) {
      await tx
        .insert(stepsDay)
        .values({ date: d.day, steps: d.steps, source, updatedAt })
        .onConflictDoUpdate({ target: stepsDay.date, set: { steps: d.steps, source, updatedAt } });
    }
  });
}
