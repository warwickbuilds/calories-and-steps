/** Pure helpers behind the Today screen readouts. */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
];

export const formatNumber = (n: number) => Math.round(n).toLocaleString('en-US');

export interface CaloriesReadout {
  /** Big number: calories left, or calories over target. */
  value: number;
  over: boolean;
  /** 0..1 fill for the calories ring (full when over). */
  progress: number;
  caption: string;
  /** Big-number text, e.g. "690" or "120 over". */
  headline: string;
}

export function caloriesReadout(eaten: number, target: number): CaloriesReadout {
  const left = target - eaten;
  const over = left < 0;
  const value = Math.abs(Math.round(left));
  return {
    value,
    over,
    progress: target > 0 ? Math.min(1, eaten / target) : 0,
    caption: `${formatNumber(eaten)} eaten of ${formatNumber(target)}`,
    headline: over ? `${formatNumber(value)} over` : formatNumber(value),
  };
}

export interface DatedWeight {
  measuredAt: string;
  weightKg: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Change between the latest entry and the entry closest to 7 days before it
 * (looking back no further than 10 days). Null when there's nothing to compare.
 */
export function weeklyChangeKg(entries: DatedWeight[]): number | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const latest = sorted[sorted.length - 1];
  const latestT = Date.parse(latest.measuredAt);
  const target = latestT - 7 * DAY_MS;
  let best: DatedWeight | null = null;
  let bestGap = Infinity;
  for (const e of sorted.slice(0, -1)) {
    const t = Date.parse(e.measuredAt);
    if (latestT - t < 3 * DAY_MS || latestT - t > 10 * DAY_MS) continue;
    const gap = Math.abs(t - target);
    if (gap < bestGap) {
      best = e;
      bestGap = gap;
    }
  }
  return best ? latest.weightKg - best.weightKg : null;
}

/** "0.3 down this week", "0.5 up this week" or "No change this week". */
export function weeklyChangeText(changeInUnits: number | null): string | null {
  if (changeInUnits == null) return null;
  const rounded = Math.round(changeInUnits * 10) / 10;
  if (rounded === 0) return 'No change this week';
  return `${Math.abs(rounded).toFixed(1)} ${rounded < 0 ? 'down' : 'up'} this week`;
}

export function stepsAccessibility(steps: number | null, target: number): string {
  return steps == null
    ? `Steps not connected. Target ${formatNumber(target)}.`
    : `Steps ${formatNumber(steps)} of ${formatNumber(target)}.`;
}
