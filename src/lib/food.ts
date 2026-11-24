/** Pure helpers behind the food log: recent foods, search, scaling and day labels. */

import { addDays, formatShortDate, fromLocalDateString, toLocalDateString } from './dates';

/** Grams for food, millilitres for drinks. */
export type FoodUnit = 'g' | 'ml';

export const isFoodUnit = (v: unknown): v is FoodUnit => v === 'g' || v === 'ml';

export interface Nutrition {
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  /** The amount, in `unit` (grams unless it says ml). */
  grams: number | null;
  unit?: FoodUnit;
}

export interface LoggedFood extends Nutrition {
  name: string;
  /** When the meal it belongs to was eaten (ISO). */
  eatenAt: string;
}

export interface RecentFood extends Nutrition {
  name: string;
  lastEatenAt: string;
  /** How many times it was logged among the rows looked at. */
  timesLogged: number;
}

const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * One entry per food name (ignoring case and spacing), using the most recent
 * serving's numbers, newest first. Generic "Quick add" rows are left out
 * because they say nothing about what was eaten.
 */
export function recentFoods(rows: LoggedFood[], limit = 50): RecentFood[] {
  const sorted = [...rows].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt));
  const byName = new Map<string, RecentFood>();
  for (const r of sorted) {
    const k = key(r.name);
    if (!k || k === 'quick add') continue;
    const seen = byName.get(k);
    if (seen) {
      seen.timesLogged += 1;
      continue;
    }
    byName.set(k, {
      name: r.name.trim(),
      calories: r.calories,
      proteinG: r.proteinG,
      carbsG: r.carbsG,
      fatG: r.fatG,
      grams: r.grams,
      unit: r.unit ?? 'g',
      lastEatenAt: r.eatenAt,
      timesLogged: 1,
    });
  }
  return [...byName.values()].slice(0, limit);
}

/** Every word of the query must appear in the name. An empty query keeps everything. */
export function searchFoods<T extends { name: string }>(foods: T[], query: string): T[] {
  const words = key(query).split(' ').filter(Boolean);
  if (words.length === 0) return foods;
  return foods.filter((f) => {
    const n = key(f.name);
    return words.every((w) => n.includes(w));
  });
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Multiplies a serving by a factor (½ portion, double, or new grams ÷ old grams). */
export function scaleNutrition(n: Nutrition, factor: number): Nutrition {
  const s = (v: number | null) => (v == null ? null : round1(v * factor));
  return {
    calories: Math.round(n.calories * factor),
    proteinG: s(n.proteinG),
    carbsG: s(n.carbsG),
    fatG: s(n.fatG),
    grams: n.grams == null ? null : Math.round(n.grams * factor),
    ...(n.unit ? { unit: n.unit } : {}),
  };
}

/** "250 ml" or "40 g". */
export function formatAmount(amount: number, unit: FoodUnit | null | undefined = 'g'): string {
  return `${Math.round(amount).toLocaleString('en-US')} ${unit ?? 'g'}`;
}

/** "Today", "Yesterday", "Tomorrow" or a short date such as "Fri 20 Nov". */
export function dayLabel(day: string, today: string = toLocalDateString()): string {
  if (day === today) return 'Today';
  const d = fromLocalDateString(day);
  const t = fromLocalDateString(today);
  if (toLocalDateString(addDays(t, -1)) === day) return 'Yesterday';
  if (toLocalDateString(addDays(t, 1)) === day) return 'Tomorrow';
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  return `${weekday} ${formatShortDate(d, d.getFullYear() !== t.getFullYear())}`;
}

/** The 7 local dates ending on `day`, oldest first. */
export function weekEndingOn(day: string): string[] {
  const end = fromLocalDateString(day);
  return Array.from({ length: 7 }, (_, i) => toLocalDateString(addDays(end, i - 6)));
}

/**
 * Average calories over the days in the list that have anything logged.
 * Empty days are skipped so a forgotten day doesn't drag the average down.
 */
export function averageLoggedCalories(
  days: string[],
  totals: Record<string, number>,
): { average: number; daysLogged: number } | null {
  const logged = days.filter((d) => (totals[d] ?? 0) > 0);
  if (logged.length === 0) return null;
  const sum = logged.reduce((s, d) => s + totals[d], 0);
  return { average: Math.round(sum / logged.length), daysLogged: logged.length };
}

/** "P 32g · C 40g · F 12g" for whichever macros are known. */
export function macroLine(n: Pick<Nutrition, 'proteinG' | 'carbsG' | 'fatG'>): string {
  return [
    n.proteinG != null ? `P ${Math.round(n.proteinG)}g` : null,
    n.carbsG != null ? `C ${Math.round(n.carbsG)}g` : null,
    n.fatG != null ? `F ${Math.round(n.fatG)}g` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
