/** Pure helpers for daily steps: turning Health Connect buckets into days, history and summaries. */

import { addDays, formatShortDate, fromLocalDateString, toLocalDateString } from './dates';

/** How many days back each sync reads. Health Connect only shares about 30 days before access was first given. */
export const SYNC_DAYS = 30;

/** Days shown in the Steps tab's daily chart. */
export const WEEK_DAYS = 7;

/** Whether the app can read steps, from the phone's point of view. */
export type StepsAccess =
  /** Not Android (web previews). */
  | 'unsupported'
  /** Health Connect isn't on this phone (Android 13 and older without the app). */
  | 'not-installed'
  /** Health Connect is there but needs an update first. */
  | 'update-required'
  /** Health Connect is ready, but the app hasn't been given access to steps. */
  | 'not-granted'
  | 'granted';

/** One day's total from Health Connect's daily buckets. */
export interface StepBucket {
  /** Local start of the bucket, e.g. "2026-11-24T00:00" (a LocalDateTime) or a full ISO time. */
  startTime: string;
  steps: number;
  /** Apps that contributed. Empty means there was no data that day. */
  origins: string[];
}

export interface StepDay {
  day: string;
  steps: number;
}

/**
 * Hourly buckets (UTC instants from Health Connect) to 24 local hours for one
 * day. Buckets from other days are ignored; missing hours are 0.
 */
export function hourlyFromBuckets(buckets: { startTime: string; steps: number }[], day: string): number[] {
  const hours = Array.from({ length: 24 }, () => 0);
  for (const b of buckets) {
    const t = new Date(b.startTime);
    if (Number.isNaN(t.getTime()) || toLocalDateString(t) !== day) continue;
    hours[t.getHours()] += Math.max(0, Math.round(Number(b.steps) || 0));
  }
  return hours;
}

/** Sum of the days with data, or null when none have any. */
export function totalSteps(days: { steps: number | null }[]): number | null {
  const withData = days.filter((d) => d.steps != null);
  return withData.length ? withData.reduce((s, d) => s + (d.steps ?? 0), 0) : null;
}

/** The local-time window a sync reads: midnight `days - 1` days ago until midnight tonight. */
export function syncWindow(now: Date = new Date(), days = SYNC_DAYS): { start: Date; end: Date } {
  const end = addDays(now, 1);
  return { start: addDays(now, -(days - 1)), end };
}

/**
 * Daily buckets to days worth saving. Days with no data at all are left out so
 * "no data" stays different from a real zero. Steps are rounded to whole numbers.
 */
export function bucketsToDays(buckets: StepBucket[]): StepDay[] {
  const out = new Map<string, number>();
  for (const b of buckets) {
    const day = b.startTime.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    if (b.origins.length === 0 && !(b.steps > 0)) continue;
    const steps = Math.max(0, Math.round(Number(b.steps) || 0));
    out.set(day, (out.get(day) ?? 0) + steps);
  }
  return [...out.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, steps]) => ({ day, steps }));
}

/** The last `days` days ending on `today`, oldest first, with null where there is no data. */
export function stepsHistory(rows: StepDay[], today: string, days: number): { day: string; steps: number | null }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.steps]));
  const end = fromLocalDateString(today);
  return Array.from({ length: days }, (_, i) => {
    const day = toLocalDateString(addDays(end, i - (days - 1)));
    return { day, steps: byDay.get(day) ?? null };
  });
}

export interface StepsSummary {
  /** Average of the days with data, rounded, or null with no data. */
  average: number | null;
  /** Days with data that reached the target. */
  daysOnTarget: number;
  /** Days that have data. */
  daysWithData: number;
  best: StepDay | null;
  /**
   * Days in a row on target, counting back from today. Today only counts once
   * it is reached, so the streak doesn't drop to zero every morning.
   */
  streak: number;
}

export function stepsSummary(history: { day: string; steps: number | null }[], target: number): StepsSummary {
  const withData = history.filter((h): h is StepDay => h.steps != null);
  const total = withData.reduce((s, h) => s + h.steps, 0);
  let best: StepDay | null = null;
  for (const h of withData) if (!best || h.steps > best.steps) best = h;

  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i].steps;
    const hit = s != null && s >= target;
    if (hit) streak++;
    else if (i === history.length - 1) continue; // today not done yet
    else break;
  }

  return {
    average: withData.length ? Math.round(total / withData.length) : null,
    daysOnTarget: withData.filter((h) => h.steps >= target).length,
    daysWithData: withData.length,
    best,
    streak,
  };
}

/** Short explanation for each access state, shown on Today, the Steps screen and Settings. */
export function accessMessage(access: StepsAccess): { title: string; body: string; action: string | null } {
  switch (access) {
    case 'granted':
      return {
        title: 'Connected to Health Connect',
        body: 'Steps are read from Health Connect, which collects them from your phone, watch or fitness apps.',
        action: null,
      };
    case 'not-granted':
      return {
        title: 'Connect steps',
        body: 'Allow the app to read your steps from Health Connect. It only reads steps and never writes anything.',
        action: 'Connect Health Connect',
      };
    case 'not-installed':
      return {
        title: 'Health Connect is needed',
        body: 'Steps come from Health Connect, Google’s free app that gathers health data on Android. Install it from the Play Store, then come back and connect.',
        action: 'Get Health Connect',
      };
    case 'update-required':
      return {
        title: 'Update Health Connect',
        body: 'Health Connect needs an update before it can share steps. Update it from the Play Store, then come back and connect.',
        action: 'Update Health Connect',
      };
    case 'unsupported':
      return {
        title: 'Steps need Android',
        body: 'Steps are read from Health Connect, which is only on Android phones.',
        action: null,
      };
  }
}

/** "Updated just now", "Updated 5 min ago", "Updated at 14:05". */
export function syncedText(at: Date | null, now: Date = new Date()): string | null {
  if (!at) return null;
  const mins = Math.floor((now.getTime() - at.getTime()) / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hh = String(at.getHours()).padStart(2, '0');
  const mm = String(at.getMinutes()).padStart(2, '0');
  return toLocalDateString(at) === toLocalDateString(now) ? `Updated at ${hh}:${mm}` : `Updated ${formatShortDate(at)}`;
}
