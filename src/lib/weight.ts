/**
 * Weight trend, change and goal projection maths. Pure functions over
 * (date, kg) pairs so they can be tested without a database.
 */

import { addDays, daysBetween, fromLocalDateString, toLocalDateString } from './dates';

export interface WeightPoint {
  /** Local date YYYY-MM-DD */
  day: string;
  kg: number;
}

export interface TrendPoint extends WeightPoint {
  trend: number;
}

/** Averages several entries on the same local day into one point, oldest first. */
export function dailyWeights(entries: { measuredAt: string; weightKg: number }[]): WeightPoint[] {
  const byDay = new Map<string, { sum: number; n: number }>();
  for (const e of entries) {
    const day = toLocalDateString(new Date(e.measuredAt));
    const cur = byDay.get(day) ?? { sum: 0, n: 0 };
    cur.sum += e.weightKg;
    cur.n += 1;
    byDay.set(day, cur);
  }
  return [...byDay.entries()]
    .map(([day, { sum, n }]) => ({ day, kg: sum / n }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * Exponentially smoothed trend so daily water swings don't dominate.
 * Each day moves the trend 10% of the way to the scale reading; gaps of
 * several days apply the smoothing once per missing day.
 */
export const TREND_SMOOTHING = 0.1;

export function withTrend(points: WeightPoint[]): TrendPoint[] {
  const out: TrendPoint[] = [];
  let trend: number | null = null;
  let prevDay: string | null = null;
  for (const p of points) {
    if (trend == null || prevDay == null) {
      trend = p.kg;
    } else {
      const gap = Math.max(1, daysBetween(fromLocalDateString(prevDay), fromLocalDateString(p.day)));
      const keep = Math.pow(1 - TREND_SMOOTHING, gap);
      trend = p.kg + (trend - p.kg) * keep;
    }
    prevDay = p.day;
    out.push({ ...p, trend });
  }
  return out;
}

export type WeightRange = '1W' | '1M' | '6M' | '1Y' | 'All';

export const RANGE_DAYS: Record<WeightRange, number | null> = {
  '1W': 7,
  '1M': 30,
  '6M': 182,
  '1Y': 365,
  All: null,
};

/** Points within the range, counting back from `today`. */
export function inRange<T extends WeightPoint>(points: T[], range: WeightRange, today: Date = new Date()): T[] {
  const days = RANGE_DAYS[range];
  if (days == null) return points;
  const from = toLocalDateString(addDays(today, -days));
  return points.filter((p) => p.day >= from);
}

/** Trend value on or just before a given day, or null when there's nothing that early. */
export function trendOn(points: TrendPoint[], day: string): number | null {
  let found: number | null = null;
  for (const p of points) {
    if (p.day <= day) found = p.trend;
    else break;
  }
  return found;
}

export interface ChangeRow {
  label: string;
  /** kg change of the trend over the period, or null when there isn't enough history. */
  kg: number | null;
}

/**
 * Trend change over the last week, month, 6 months, year and all time.
 * A period only shows a number when the first weigh-in is at least that old.
 */
export function changeRows(points: TrendPoint[], today: Date = new Date()): ChangeRow[] {
  if (points.length === 0) {
    return ['Week', 'Month', '6 months', 'Year', 'All time'].map((label) => ({ label, kg: null }));
  }
  const latest = points[points.length - 1].trend;
  const first = points[0];
  const periods: [string, number][] = [
    ['Week', 7],
    ['Month', 30],
    ['6 months', 182],
    ['Year', 365],
  ];
  const rows: ChangeRow[] = periods.map(([label, days]) => {
    const day = toLocalDateString(addDays(today, -days));
    if (first.day > day) return { label, kg: null };
    const then = trendOn(points, day);
    return { label, kg: then == null ? null : latest - then };
  });
  rows.push({ label: 'All time', kg: points.length > 1 ? latest - first.trend : null });
  return rows;
}

/** Least-squares slope of the trend over the last `days`, in kg per day. Null with too little data. */
export function trendSlope(points: TrendPoint[], days = 28, today: Date = new Date()): number | null {
  const from = toLocalDateString(addDays(today, -days));
  const recent = points.filter((p) => p.day >= from);
  if (recent.length < 4) return null;
  const span = daysBetween(fromLocalDateString(recent[0].day), fromLocalDateString(recent[recent.length - 1].day));
  if (span < 7) return null;
  const xs = recent.map((p) => daysBetween(fromLocalDateString(recent[0].day), fromLocalDateString(p.day)));
  const ys = recent.map((p) => p.trend);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export type Projection =
  | { kind: 'no-goal' }
  | { kind: 'reached' }
  | { kind: 'not-enough-data' }
  | { kind: 'wrong-way' }
  | { kind: 'on-track'; date: Date; days: number };

export function projectGoal(
  points: TrendPoint[],
  goalKg: number | null | undefined,
  today: Date = new Date(),
): Projection {
  if (goalKg == null) return { kind: 'no-goal' };
  if (points.length === 0) return { kind: 'not-enough-data' };
  const current = points[points.length - 1].trend;
  const remaining = goalKg - current;
  if (Math.abs(remaining) < 0.2) return { kind: 'reached' };
  const slope = trendSlope(points, 28, today);
  if (slope == null) return { kind: 'not-enough-data' };
  // Flat, or moving away from the goal.
  if (Math.abs(slope) < 0.005 || Math.sign(slope) !== Math.sign(remaining)) return { kind: 'wrong-way' };
  const days = Math.ceil(remaining / slope);
  // Beyond five years isn't a useful projection.
  if (days > 5 * 365) return { kind: 'wrong-way' };
  return { kind: 'on-track', days, date: addDays(today, days) };
}

/** kg per week needed to reach the goal by the target date, or null if the date has passed. */
export function rateNeededPerWeek(
  currentKg: number,
  goalKg: number,
  goalDate: string,
  today: Date = new Date(),
): number | null {
  const days = daysBetween(today, fromLocalDateString(goalDate));
  if (days <= 0) return null;
  return ((goalKg - currentKg) / days) * 7;
}
