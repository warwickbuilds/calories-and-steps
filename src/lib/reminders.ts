/**
 * Pure smart-reminder configuration, formatting, and rolling 7-day scheduling.
 * Kept free of Expo/React imports so it can be unit tested directly.
 */

import { addDays, toLocalDateString } from './dates';
import type { MealType } from './today';

export type ReminderId = 'weigh_in' | 'breakfast' | 'lunch' | 'dinner' | 'evening';

export interface ReminderPref {
  enabled: boolean;
  hour: number;
  minute: number;
}

export type ReminderSettings = Record<ReminderId, ReminderPref>;

export interface TodayCompletion {
  weighedIn: boolean;
  mealsLogged: ReadonlySet<MealType>;
}

export interface ReminderMeta {
  id: ReminderId;
  label: string;
  hint: string;
  title: string;
  body: string;
  route: string;
  defaultHour: number;
  defaultMinute: number;
  tone: 'weight' | 'calories' | 'neutral';
}

export const REMINDER_IDS: readonly ReminderId[] = [
  'weigh_in',
  'breakfast',
  'lunch',
  'dinner',
  'evening',
];

export const REMINDER_META: Record<ReminderId, ReminderMeta> = {
  weigh_in: {
    id: 'weigh_in',
    label: 'Morning weigh-in',
    hint: 'Skipped once you weigh in today',
    title: 'Time to weigh in',
    body: 'Log today’s weight to keep your trend on track.',
    route: '/(tabs)/weight',
    defaultHour: 7,
    defaultMinute: 30,
    tone: 'weight',
  },
  breakfast: {
    id: 'breakfast',
    label: 'Breakfast',
    hint: 'Skipped once breakfast is logged',
    title: 'Log breakfast',
    body: 'Nothing logged for breakfast yet.',
    route: '/add-food?meal=breakfast',
    defaultHour: 9,
    defaultMinute: 30,
    tone: 'calories',
  },
  lunch: {
    id: 'lunch',
    label: 'Lunch',
    hint: 'Skipped once lunch is logged',
    title: 'Log lunch',
    body: 'Keep today’s calories on track.',
    route: '/add-food?meal=lunch',
    defaultHour: 13,
    defaultMinute: 30,
    tone: 'calories',
  },
  dinner: {
    id: 'dinner',
    label: 'Dinner',
    hint: 'Skipped once dinner is logged',
    title: 'Log dinner',
    body: 'Nothing logged for dinner yet.',
    route: '/add-food?meal=dinner',
    defaultHour: 19,
    defaultMinute: 30,
    tone: 'calories',
  },
  evening: {
    id: 'evening',
    label: 'Evening wrap-up',
    hint: 'Daily check-in on calories and steps',
    title: 'Wrap up today',
    body: 'Check your calories and steps before bed.',
    route: '/(tabs)',
    defaultHour: 21,
    defaultMinute: 0,
    tone: 'neutral',
  },
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  weigh_in: { enabled: false, hour: 7, minute: 30 },
  breakfast: { enabled: false, hour: 9, minute: 30 },
  lunch: { enabled: false, hour: 13, minute: 30 },
  dinner: { enabled: false, hour: 19, minute: 30 },
  evening: { enabled: false, hour: 21, minute: 0 },
};

export const REMINDER_ID_PREFIX = 'reminder:';
export const DEFAULT_HORIZON_DAYS = 7;

const clampInt = (n: unknown, min: number, max: number, fallback: number) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
};

/** Safely parses persisted reminder settings, clamping hours/minutes and filling missing keys. */
export function parseReminderSettings(raw: unknown): ReminderSettings {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = {} as ReminderSettings;
  for (const id of REMINDER_IDS) {
    const def = DEFAULT_REMINDERS[id];
    const entry = obj[id] && typeof obj[id] === 'object' ? (obj[id] as Record<string, unknown>) : null;
    out[id] = {
      enabled: typeof entry?.enabled === 'boolean' ? entry.enabled : def.enabled,
      hour: clampInt(entry?.hour, 0, 23, def.hour),
      minute: clampInt(entry?.minute, 0, 59, def.minute),
    };
  }
  return out;
}

/** Formats 24-hour clock fields as a clean 12-hour label, e.g. "7:30 AM" or "1:05 PM". */
export function formatReminderTime(hour: number, minute: number): string {
  const h = clampInt(hour, 0, 23, 0);
  const m = clampInt(minute, 0, 59, 0);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function anyReminderEnabled(settings: ReminderSettings): boolean {
  return REMINDER_IDS.some((id) => settings[id].enabled);
}

/** Returns true if today's reminder for `id` should be skipped because the user already logged it. */
export function isCompletedToday(id: ReminderId, today: TodayCompletion): boolean {
  if (id === 'weigh_in') return today.weighedIn;
  if (id === 'breakfast' || id === 'lunch' || id === 'dinner') return today.mealsLogged.has(id);
  return false;
}

export interface ScheduledReminder {
  identifier: string;
  id: ReminderId;
  day: string;
  fireAt: Date;
  title: string;
  body: string;
  route: string;
}

/**
 * Builds the next `horizonDays` (default 7) local notifications to schedule.
 * - Day 0 (today) is skipped if its time has passed (within a 15-second buffer)
 *   or if the user already logged that meal / weigh-in today.
 * - Future days (1 .. horizonDays - 1) are always scheduled so reminders keep
 *   working even when the app isn't opened for several days.
 */
export function buildReminderSchedule(
  settings: ReminderSettings,
  today: TodayCompletion,
  now: Date = new Date(),
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): ScheduledReminder[] {
  const items: ScheduledReminder[] = [];
  const baseDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const minTime = now.getTime() + 15_000;

  for (const id of REMINDER_IDS) {
    const pref = settings[id];
    if (!pref.enabled) continue;
    const meta = REMINDER_META[id];
    const skipToday = isCompletedToday(id, today);

    for (let offset = 0; offset < horizonDays; offset++) {
      if (offset === 0 && skipToday) continue;
      const dayDate = addDays(baseDay, offset);
      const fireAt = new Date(
        dayDate.getFullYear(),
        dayDate.getMonth(),
        dayDate.getDate(),
        pref.hour,
        pref.minute,
        0,
        0,
      );
      if (fireAt.getTime() <= minTime) continue;
      const day = toLocalDateString(dayDate);
      items.push({
        identifier: `${REMINDER_ID_PREFIX}${id}:${day}`,
        id,
        day,
        fireAt,
        title: meta.title,
        body: meta.body,
        route: meta.route,
      });
    }
  }

  return items.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

const ALLOWED_ROUTES = new Set<string>([
  '/(tabs)',
  '/(tabs)/weight',
  '/add-food?meal=breakfast',
  '/add-food?meal=lunch',
  '/add-food?meal=dinner',
]);

/** Guards notification deep-link payloads to known internal routes only. */
export function parseNotificationRoute(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const route = (data as Record<string, unknown>).route;
  return typeof route === 'string' && ALLOWED_ROUTES.has(route) ? route : null;
}
