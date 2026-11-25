/** Pure helpers behind the Today screen readouts. */

import { periodChange, type WeightPoint } from './weight';

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
  /** 0..1 of the target still to eat, for the countdown gauge (0 when over). */
  remaining: number;
  caption: string;
  /** Big-number text, e.g. "690" or "120 over". */
  headline: string;
  /** Word under the gauge number: "left" or "over". */
  status: 'left' | 'over';
}

export function caloriesReadout(eaten: number, target: number): CaloriesReadout {
  const left = target - eaten;
  const over = left < 0;
  const value = Math.abs(Math.round(left));
  return {
    value,
    over,
    progress: target > 0 ? Math.min(1, eaten / target) : 0,
    remaining: target > 0 && !over ? Math.min(1, left / target) : 0,
    status: over ? 'over' : 'left',
    caption: `${formatNumber(eaten)} eaten of ${formatNumber(target)}`,
    headline: over ? `${formatNumber(value)} over` : formatNumber(value),
  };
}

/** "0.3 down this week", "0.5 up this week" or "No change this week". Fed the trend change. */
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

export const isMealType = (v: unknown): v is MealType => MEAL_TYPES.some((m) => m.value === v);

export const isLocalDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export type Macro = 'protein' | 'carbs' | 'fat';

export interface MacroSlice {
  key: Macro;
  label: string;
  grams: number;
  target: number;
  /** Share of the calories that came from macros, 0..1. Protein and carbs 4 per gram, fat 9. */
  share: number;
}

const CALORIES_PER_GRAM: Record<Macro, number> = { protein: 4, carbs: 4, fat: 9 };

/** Protein, carbs and fat for the split bar, sized by the calories each one gave. */
export function macroSplit(
  eaten: { proteinG: number; carbsG: number; fatG: number },
  targets: { proteinG: number; carbsG: number; fatG: number } | null,
): MacroSlice[] {
  const rows: [Macro, string, number, number][] = [
    ['protein', 'Protein', eaten.proteinG, targets?.proteinG ?? 0],
    ['carbs', 'Carbs', eaten.carbsG, targets?.carbsG ?? 0],
    ['fat', 'Fat', eaten.fatG, targets?.fatG ?? 0],
  ];
  const cals = rows.map(([key, , g]) => Math.max(0, g) * CALORIES_PER_GRAM[key]);
  const total = cals.reduce((a, b) => a + b, 0);
  return rows.map(([key, label, grams, target], i) => ({
    key,
    label,
    grams: Math.max(0, Math.round(grams)),
    target: Math.round(target),
    share: total > 0 ? cals[i] / total : 0,
  }));
}

export interface WeightChangeTile {
  label: string;
  /** Change in kg from actual weigh-ins (negative = down), or null when there is nothing to compare. */
  kg: number | null;
  /** True when your first weigh-in is inside the period, so the change is since then. */
  partial: boolean;
}

/** The three weigh-in changes at the top of Today: 7 days, 1 month and 3 months. */
export function todayWeightChanges(points: WeightPoint[], today: Date = new Date()): WeightChangeTile[] {
  const periods: [string, number][] = [
    ['7 days', 7],
    ['1 month', 30],
    ['3 months', 91],
  ];
  return periods.map(([label, days]) => {
    const c = periodChange(points, days, today);
    return { label, kg: c.kg, partial: c.partial };
  });
}

/** Display amount and direction for a change already in display units, rounded to 0.1. */
export function changeParts(changeInUnits: number | null): { amount: string; direction: 'down' | 'up' | 'same' } | null {
  if (changeInUnits == null) return null;
  const rounded = Math.round(changeInUnits * 10) / 10;
  if (rounded === 0) return { amount: '0.0', direction: 'same' };
  return { amount: Math.abs(rounded).toFixed(1), direction: rounded < 0 ? 'down' : 'up' };
}

/** "3,420 to go" or "Target hit" under the steps number. */
export function stepsToGo(steps: number, target: number): string {
  const left = Math.round(target - steps);
  return left > 0 ? `${formatNumber(left)} to go` : 'Target hit';
}
