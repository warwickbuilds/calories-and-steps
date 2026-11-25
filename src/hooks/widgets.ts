import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';

import { dayItemsQuery, latestWeightQuery, profileQuery } from '@/db/queries';
import { stepsForDayQuery } from '@/db/steps';
import { useStepsSync } from '@/hooks/steps';
import { useToday } from '@/hooks/useToday';
import { currentAge, dailyTargets } from '@/lib/energy';
import { buildCaloriesWidgetProps, buildStepsWidgetProps } from '@/lib/widgets';
import CaloriesWidget from '@/widgets/CaloriesWidget';
import StepsWidget from '@/widgets/StepsWidget';

/**
 * Pushes fresh snapshots to the 1×1 Android Daily Steps and Calories Left
 * home-screen widgets whenever today's steps, logged calories, or targets
 * change, or when the app foregrounds/backgrounds.
 *
 * Waits for each SQLite live query to finish hydrating (`updatedAt !== undefined`)
 * before pushing so cached home-screen widgets are never overwritten with empty
 * placeholder values on cold start.
 */
export function useWidgetsSync() {
  const today = useToday();
  const { data: profileRows, updatedAt: profileLoadedAt } = useLiveQuery(profileQuery());
  const { data: weightRows, updatedAt: weightLoadedAt } = useLiveQuery(latestWeightQuery());
  const { data: itemRows, updatedAt: itemsLoadedAt } = useLiveQuery(dayItemsQuery(today), [today]);
  const { data: stepRows, updatedAt: stepsLoadedAt } = useLiveQuery(stepsForDayQuery(today), [today]);
  const { access, lastSyncedAt } = useStepsSync();

  const profile = profileRows?.[0] ?? null;
  const latestWeight = weightRows?.[0] ?? null;
  const syncedSteps = stepRows?.[0]?.steps ?? null;

  const eatenCalories = useMemo(() => {
    let sum = 0;
    for (const item of itemRows ?? []) sum += item.calories;
    return sum;
  }, [itemRows]);

  const targetCalories = useMemo(() => {
    if (!profile || !latestWeight) return 0;
    return dailyTargets({
      sex: profile.sex,
      weightKg: latestWeight.weightKg,
      heightCm: profile.heightCm,
      age: currentAge(profile.ageYears, profile.ageSetOn),
      activity: profile.activityLevel,
      goal: profile.goalMode,
      macros: profile.macroOverrides,
    }).calories;
  }, [profile, latestWeight]);

  const stepTarget = profile?.stepTarget ?? 10_000;
  const stepsReady = profileLoadedAt !== undefined && stepsLoadedAt !== undefined && (syncedSteps != null || access !== null);
  const steps: number | null = syncedSteps ?? (access === 'granted' ? 0 : null);
  const caloriesReady =
    profileLoadedAt !== undefined && weightLoadedAt !== undefined && itemsLoadedAt !== undefined;

  useEffect(() => {
    if (Platform.OS !== 'android' || !stepsReady) return;

    const pushSteps = () => {
      try {
        StepsWidget.updateSnapshot(buildStepsWidgetProps(steps, stepTarget, today));
      } catch {
        // Ignore if the native widget module isn't linked (e.g. older dev build).
      }
    };

    pushSteps();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') pushSteps();
    });
    return () => sub.remove();
  }, [stepsReady, steps, stepTarget, today, lastSyncedAt]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !caloriesReady) return;

    const pushCalories = () => {
      try {
        CaloriesWidget.updateSnapshot(buildCaloriesWidgetProps(eatenCalories, targetCalories, today));
      } catch {
        // Ignore if the native widget module isn't linked (e.g. older dev build).
      }
    };

    pushCalories();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') pushCalories();
    });
    return () => sub.remove();
  }, [caloriesReady, eatenCalories, targetCalories, today]);
}
