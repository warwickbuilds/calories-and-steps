import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { dayItemsQuery, latestWeightQuery, profileQuery, recentWeightsQuery } from '@/db/queries';
import { addDays, toLocalDateString } from '@/lib/dates';
import { currentAge, dailyTargets } from '@/lib/energy';
import { MEAL_TYPES, type MealType } from '@/lib/today';

export function useProfile() {
  const { data, updatedAt } = useLiveQuery(profileQuery());
  return { profile: data?.[0] ?? null, loaded: updatedAt !== undefined };
}

export function useLatestWeight() {
  const { data } = useLiveQuery(latestWeightQuery());
  return data?.[0] ?? null;
}

/** Weight entries from the last 14 days, newest first. */
export function useRecentWeights() {
  const since = useMemo(() => addDays(new Date(), -14).toISOString(), []);
  const { data } = useLiveQuery(recentWeightsQuery(since), [since]);
  return data ?? [];
}

/** Calorie and macro targets from the profile and latest weight. */
export function useTargets() {
  const { profile } = useProfile();
  const latest = useLatestWeight();
  return useMemo(() => {
    if (!profile || !latest) return null;
    return dailyTargets({
      sex: profile.sex,
      weightKg: latest.weightKg,
      heightCm: profile.heightCm,
      age: currentAge(profile.ageYears, profile.ageSetOn),
      activity: profile.activityLevel,
      goal: profile.goalMode,
      macros: profile.macroOverrides,
    });
  }, [profile, latest]);
}

export interface DayTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  byMeal: Record<MealType, { calories: number; count: number }>;
}

export function useDayItems(day: string = toLocalDateString()) {
  const { data } = useLiveQuery(dayItemsQuery(day), [day]);
  return data ?? [];
}

export function useDayTotals(day: string = toLocalDateString()): DayTotals {
  const items = useDayItems(day);
  return useMemo(() => {
    const byMeal = Object.fromEntries(
      MEAL_TYPES.map((m) => [m.value, { calories: 0, count: 0 }]),
    ) as DayTotals['byMeal'];
    const totals = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    for (const i of items) {
      totals.calories += i.calories;
      totals.proteinG += i.proteinG ?? 0;
      totals.carbsG += i.carbsG ?? 0;
      totals.fatG += i.fatG ?? 0;
      byMeal[i.mealType].calories += i.calories;
      byMeal[i.mealType].count += 1;
    }
    return { ...totals, byMeal };
  }, [items]);
}
