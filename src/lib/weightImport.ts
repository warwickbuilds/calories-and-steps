/**
 * Turning what an AI model read from weight-app screenshots into rows the
 * user can review: check and normalise each row, merge overlapping
 * screenshots, and compare with weights already in the app.
 * Pure functions; the AI call lives in src/lib/ai/weightScreenshot.ts.
 */

import { toLocalDateString } from './dates';
import { lbToKg } from './units';

export type ReadSource = 'list' | 'chart';

/** One row as the model returns it. */
export type RawRow = {
  year: number | null;
  month: number;
  day: number;
  weight: number;
  unit: 'kg' | 'lb';
  source: ReadSource;
};

/** A checked row from one screenshot. */
export type ParsedRow = {
  /** Local date, YYYY-MM-DD. */
  day: string;
  kg: number;
  source: ReadSource;
  /** True when the screenshot didn't show a year and we worked it out. */
  yearGuessed: boolean;
};

export const MIN_KG = 20;
export const MAX_KG = 400;
const EARLIEST_YEAR = 1990;

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

function isRealDate(y: number, m: number, d: number): boolean {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** The latest year in which month/day falls on or before today. */
export function inferYear(month: number, day: number, today: Date): number {
  let y = today.getFullYear();
  // 29 February only exists in leap years, so step back until it's real.
  for (let i = 0; i < 8; i++, y--) {
    if (!isRealDate(y, month, day)) continue;
    if (new Date(y, month - 1, day) <= today) return y;
  }
  return y;
}

/**
 * Validates the model's answer for one screenshot. Rows that are not real
 * dates, are in the future, or have an impossible weight are dropped and
 * counted, never guessed at.
 */
export function normaliseRows(answer: unknown, today: Date = new Date()): { rows: ParsedRow[]; dropped: number } {
  const list = (answer as { rows?: unknown })?.rows;
  if (!Array.isArray(list)) return { rows: [], dropped: 0 };
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  const rows: ParsedRow[] = [];
  let dropped = 0;
  for (const r of list as Partial<RawRow>[]) {
    const month = Number(r?.month);
    const dayOfMonth = Number(r?.day);
    const weight = Number(r?.weight);
    const unit = r?.unit === 'lb' ? 'lb' : r?.unit === 'kg' ? 'kg' : null;
    const source: ReadSource = r?.source === 'chart' ? 'chart' : 'list';
    if (!Number.isInteger(month) || !Number.isInteger(dayOfMonth) || !Number.isFinite(weight) || !unit) {
      dropped++;
      continue;
    }
    const yearGiven = r?.year != null && Number.isInteger(Number(r.year));
    const year = yearGiven ? Number(r.year) : inferYear(month, dayOfMonth, endOfToday);
    if (!isRealDate(year, month, dayOfMonth) || year < EARLIEST_YEAR) {
      dropped++;
      continue;
    }
    const date = new Date(year, month - 1, dayOfMonth);
    if (date > endOfToday) {
      dropped++;
      continue;
    }
    const kg = round(unit === 'lb' ? lbToKg(weight) : weight, 2);
    if (kg < MIN_KG || kg > MAX_KG) {
      dropped++;
      continue;
    }
    rows.push({ day: toLocalDateString(date), kg, source, yearGuessed: !yearGiven });
  }
  return { rows, dropped };
}

/** One date after merging every screenshot. */
export type MergedRow = {
  day: string;
  kg: number;
  source: ReadSource;
  yearGuessed: boolean;
  /** Other weights read for the same date from the list (a misread or a second weigh-in). */
  otherReadings: number[];
};

/**
 * Merges rows from several screenshots by date. Overlapping screenshots
 * give the same row twice, so list rows win over chart estimates, and when
 * list rows disagree the most common reading wins (the first on a tie).
 */
export function mergeRows(shots: ParsedRow[][]): MergedRow[] {
  const byDay = new Map<string, ParsedRow[]>();
  for (const row of shots.flat()) {
    const rows = byDay.get(row.day) ?? [];
    rows.push(row);
    byDay.set(row.day, rows);
  }
  const merged: MergedRow[] = [];
  for (const [day, rows] of byDay) {
    const list = rows.filter((r) => r.source === 'list');
    const yearGuessed = rows.every((r) => r.yearGuessed);
    if (list.length > 0) {
      const counts = new Map<number, number>();
      for (const r of list) {
        const v = round(r.kg, 1);
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      let best = round(list[0].kg, 1);
      for (const [v, c] of counts) if (c > (counts.get(best) ?? 0)) best = v;
      const exact = list.find((r) => round(r.kg, 1) === best)!.kg;
      merged.push({
        day,
        kg: exact,
        source: 'list',
        yearGuessed,
        otherReadings: [...counts.keys()].filter((v) => v !== best),
      });
    } else {
      const avg = rows.reduce((s, r) => s + r.kg, 0) / rows.length;
      merged.push({ day, kg: round(avg, 1), source: 'chart', yearGuessed, otherReadings: [] });
    }
  }
  return merged.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

export type ExistingWeight = { id: number; measuredAt: string; weightKg: number };

export type ReviewStatus = 'new' | 'same' | 'different';

export type ReviewRow = MergedRow & {
  status: ReviewStatus;
  /** The weight already logged on this date, if any. */
  existingKg: number | null;
  existingId: number | null;
  selected: boolean;
};

/** Within this many kg a reading counts as the same as what's already logged. */
export const SAME_TOLERANCE_KG = 0.05;

/**
 * Compares merged rows with what's already in the app.
 * Default selection: new list rows are ticked. Chart estimates are ticked
 * only when the import found no list rows at all. Dates already logged are
 * never ticked by default, so nothing is overwritten unless the user asks.
 */
export function compareWithExisting(rows: MergedRow[], existing: ExistingWeight[]): ReviewRow[] {
  const latestByDay = new Map<string, ExistingWeight>();
  for (const e of existing) {
    const day = toLocalDateString(new Date(e.measuredAt));
    const prev = latestByDay.get(day);
    if (!prev || e.measuredAt > prev.measuredAt) latestByDay.set(day, e);
  }
  const hasList = rows.some((r) => r.source === 'list');
  return rows.map((r) => {
    const e = latestByDay.get(r.day);
    if (!e) {
      return {
        ...r,
        status: 'new' as const,
        existingKg: null,
        existingId: null,
        selected: r.source === 'list' || !hasList,
      };
    }
    const same = Math.abs(e.weightKg - r.kg) < SAME_TOLERANCE_KG;
    return {
      ...r,
      status: same ? ('same' as const) : ('different' as const),
      existingKg: e.weightKg,
      existingId: e.id,
      selected: false,
    };
  });
}

/** The instant an imported weight is stored at: midday local time, so time zones never move it to another day. */
export function importTimestamp(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}
