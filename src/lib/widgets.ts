/**
 * Pure snapshot builders for the 1×1 Android home-screen widgets (Daily Steps
 * and Calories Left). Kept free of Expo/React imports so they can be unit
 * tested and every formatted value stays ≤ 4 characters to fit cleanly inside
 * a 1×1 circular progress ring without clipping.
 */

import { caloriesReadout } from './today';

export interface StepsWidgetProps {
  /** Compact step count inside the ring (≤ 4 chars), e.g. "850", "6.4k", "10k". */
  valueLabel: string;
  /** Short uppercase micro-label under the number ("STEPS"). */
  label: string;
  /** 0..1 progress towards daily step target (drives both circle and bar). */
  progress: number;
  /** True when today's steps met or exceeded the target. */
  reached: boolean;
  /** Local date string YYYY-MM-DD for the snapshot. */
  updatedDay: string;
}

export interface CaloriesWidgetProps {
  /** Compact calorie readout inside the ring (≤ 4 chars), e.g. "690", "1450", "150". */
  valueLabel: string;
  /** Short uppercase micro-label under the number: "LEFT", "OVER", or "CAL". */
  label: string;
  /** 0..1 progress for both circle and bar (remaining share, or 1 when over). */
  progress: number;
  /** True when today's calories exceed the daily target. */
  over: boolean;
  /** Local date string YYYY-MM-DD for the snapshot. */
  updatedDay: string;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Compact step count guaranteed ≤ 4 characters so it never clips inside a 1×1 ring:
 * - 0..999      → "0", "450", "999"
 * - 1,000..9,949 → "1k", "1.2k", "6.4k", "9.9k"
 * - 9,950+      → "10k", "12k", "25k"
 */
export function formatCompactSteps(n: number): string {
  const rounded = Math.max(0, Math.round(n));
  if (rounded < 1000) return String(rounded);
  if (rounded < 9950) {
    const tenths = Math.round(rounded / 100) / 10;
    return Number.isInteger(tenths) ? `${tenths}k` : `${tenths.toFixed(1)}k`;
  }
  return `${Math.round(rounded / 1000)}k`;
}

/**
 * Compact calorie value guaranteed ≤ 4 characters so it never clips inside a 1×1 ring:
 * - 0..9,999 → exact integer without comma ("0", "690", "1450", "2100")
 * - 10,000+  → rounded thousands ("10k", "12k")
 */
export function formatCompactCalories(n: number): string {
  const rounded = Math.max(0, Math.round(n));
  if (rounded < 10_000) return String(rounded);
  return `${Math.round(rounded / 1000)}k`;
}

export function buildStepsWidgetProps(
  steps: number | null,
  target: number,
  updatedDay: string,
): StepsWidgetProps {
  const safeTarget = target > 0 ? Math.round(target) : 10_000;
  if (steps == null) {
    return {
      valueLabel: '–',
      label: 'STEPS',
      progress: 0,
      reached: false,
      updatedDay,
    };
  }
  const safeSteps = Math.max(0, Math.round(steps));
  const progress = clamp01(safeSteps / safeTarget);
  const reached = safeSteps >= safeTarget;
  return {
    valueLabel: formatCompactSteps(safeSteps),
    label: 'STEPS',
    progress,
    reached,
    updatedDay,
  };
}

export function buildCaloriesWidgetProps(
  eaten: number,
  target: number,
  updatedDay: string,
): CaloriesWidgetProps {
  const safeEaten = Math.max(0, Math.round(eaten));
  if (!(target > 0)) {
    return {
      valueLabel: safeEaten > 0 ? formatCompactCalories(safeEaten) : '–',
      label: 'CAL',
      progress: 0,
      over: false,
      updatedDay,
    };
  }
  const safeTarget = Math.round(target);
  const readout = caloriesReadout(safeEaten, safeTarget);
  return {
    valueLabel: formatCompactCalories(readout.value),
    label: readout.over ? 'OVER' : 'LEFT',
    progress: readout.over ? 1 : clamp01(readout.remaining),
    over: readout.over,
    updatedDay,
  };
}
