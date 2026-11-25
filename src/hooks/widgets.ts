import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useDayTotals, useProfile, useTargets } from '@/hooks/data';
import { useDaySteps, useStepsSync } from '@/hooks/steps';
import { useToday } from '@/hooks/useToday';
import { buildCaloriesWidgetProps, buildStepsWidgetProps } from '@/lib/widgets';
import CaloriesWidget from '@/widgets/CaloriesWidget';
import StepsWidget from '@/widgets/StepsWidget';

/**
 * Pushes fresh snapshots to the Android Daily Steps and Calories Left
 * home-screen widgets whenever today's steps, logged calories, or targets
 * change, or when the app foregrounds/backgrounds.
 */
export function useWidgetsSync() {
  const today = useToday();
  const { profile } = useProfile();
  const targets = useTargets();
  const totals = useDayTotals(today);
  const { access } = useStepsSync();
  const syncedSteps = useDaySteps(today);

  const stepTarget = profile?.stepTarget ?? 10_000;
  const steps: number | null = syncedSteps ?? (access === 'granted' ? 0 : null);
  const targetCalories = targets?.calories ?? 0;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const push = () => {
      try {
        StepsWidget.updateSnapshot(buildStepsWidgetProps(steps, stepTarget, today));
        CaloriesWidget.updateSnapshot(buildCaloriesWidgetProps(totals.calories, targetCalories, today));
      } catch {
        // Ignore if the native widget module isn't linked (e.g. older dev build).
      }
    };

    push();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') push();
    });
    return () => sub.remove();
  }, [today, steps, stepTarget, totals.calories, targetCalories]);
}
