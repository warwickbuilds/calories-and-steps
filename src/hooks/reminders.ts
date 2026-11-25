import { router, type Href } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { useDayTotals, useLatestWeight } from '@/hooks/data';
import { useToday } from '@/hooks/useToday';
import { dayBounds, fromLocalDateString } from '@/lib/dates';
import {
  applyReminderSchedule,
  subscribeNotificationTaps,
  takeInitialNotificationData,
} from '@/lib/notifications';
import {
  anyReminderEnabled,
  buildReminderSchedule,
  parseNotificationRoute,
} from '@/lib/reminders';
import { useReminderSettings } from '@/lib/reminderState';
import { MEAL_TYPES, type MealType } from '@/lib/today';

/**
 * Keeps the phone's 7-day rolling local notification schedule aligned with
 * the user's reminder preferences and what has already been logged today.
 * Mounted once in the tabs layout alongside `useStepsAutoSync`.
 */
export function useRemindersSync() {
  const settings = useReminderSettings();
  const today = useToday();
  const totals = useDayTotals(today);
  const latestWeight = useLatestWeight();

  const { start, end } = useMemo(() => dayBounds(fromLocalDateString(today)), [today]);
  const weighedIn =
    !!latestWeight &&
    latestWeight.measuredAt >= start.toISOString() &&
    latestWeight.measuredAt < end.toISOString();

  // Stable string key for which meal slots have items today, so re-renders only resync on real changes.
  const loggedMealsKey = MEAL_TYPES.filter((m) => totals.byMeal[m.value].count > 0)
    .map((m) => m.value)
    .join(',');

  useEffect(() => {
    const sync = () => {
      if (!anyReminderEnabled(settings)) {
        void applyReminderSchedule([]);
        return;
      }
      const mealsLogged = new Set<MealType>(
        loggedMealsKey ? (loggedMealsKey.split(',') as MealType[]) : [],
      );
      const items = buildReminderSchedule(settings, { weighedIn, mealsLogged });
      void applyReminderSchedule(items);
    };

    sync();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, [settings, today, weighedIn, loggedMealsKey]);
}

/**
 * Navigates to the reminder's target screen when the user taps a notification
 * (both when the app is already open and on cold launch).
 */
export function useNotificationDeepLink(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handle = (data: unknown) => {
      const route = parseNotificationRoute(data);
      if (route) router.push(route as Href);
    };

    handle(takeInitialNotificationData());
    return subscribeNotificationTaps(handle);
  }, [enabled]);
}
