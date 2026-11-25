/**
 * Pure snapshot builders for the Android home-screen widgets (Daily Steps &
 * Calories Left). Kept free of Expo/React imports so they can be unit tested.
 */

import { caloriesReadout, formatNumber } from './today';

export interface StepsWidgetProps {
  /** Compact number inside the progress ring, e.g. "6,420" or "10.4k". */
  valueLabel: string;
  /** Compact caption below the bar, e.g. "of 10k" or "Target hit". */
  subLabel: string;
  /** 0..1 progress towards daily step target. */
  progress: number;
  /** True when today's steps met or exceeded the target. */
  reached: boolean;
  /** Local date string YYYY-MM-DD for the snapshot. */
  updatedDay: string;
}

export interface CaloriesWidgetProps {
  /** Compact number inside the progress ring, e.g. "690" or "120". */
  valueLabel: string;
  /** Short word under the number: "left", "over", or "calories". */
  statusLabel: string;
  /** Compact eaten/target caption below the bar, e.g. "1,410 / 2,100". */
  subLabel: string;
  /** 0..1 fill for the circular ring (remaining share, or 1 when over). */
  remainingProgress: number;
  /** 0..1 fill for the bottom bar (eaten share of target). */
  eatenProgress: number;
  /** True when today's calories exceed the daily target. */
  over: boolean;
  /** Local date string YYYY-MM-DD for the snapshot. */
  updatedDay: string;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Compact label for tight widget circles: "6,420" under 10k, "10.4k" at 10k+. */
export function formatCompactCount(n: number): string {
  const rounded = Math.max(0, Math.round(n));
  if (rounded < 10_000) return formatNumber(rounded);
  const tenths = Math.round(rounded / 100) / 10;
  return Number.isInteger(tenths) ? `${tenths}k` : `${tenths.toFixed(1)}k`;
}

/** Compact target label: "10k" for 10,000, "7.5k" for 7,500, or exact number under 1,000. */
export function formatCompactTarget(n: number): string {
  const rounded = Math.max(0, Math.round(n));
  if (rounded < 1000) return formatNumber(rounded);
  const tenths = Math.round(rounded / 100) / 10;
  return Number.isInteger(tenths) ? `${tenths}k` : `${tenths.toFixed(1)}k`;
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
      subLabel: `of ${formatCompactTarget(safeTarget)}`,
      progress: 0,
      reached: false,
      updatedDay,
    };
  }
  const safeSteps = Math.max(0, Math.round(steps));
  const progress = clamp01(safeSteps / safeTarget);
  const reached = safeSteps >= safeTarget;
  return {
    valueLabel: formatCompactCount(safeSteps),
    subLabel: reached ? 'Target hit' : `of ${formatCompactTarget(safeTarget)}`,
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
      valueLabel: safeEaten > 0 ? formatNumber(safeEaten) : '–',
      statusLabel: 'calories',
      subLabel: 'Open app',
      remainingProgress: 0,
      eatenProgress: 0,
      over: false,
      updatedDay,
    };
  }
  const safeTarget = Math.round(target);
  const readout = caloriesReadout(safeEaten, safeTarget);
  return {
    valueLabel: formatNumber(readout.value),
    statusLabel: readout.status,
    subLabel: `${formatNumber(safeEaten)} / ${formatNumber(safeTarget)}`,
    remainingProgress: readout.over ? 1 : clamp01(readout.remaining),
    eatenProgress: clamp01(readout.progress),
    over: readout.over,
    updatedDay,
  };
}
