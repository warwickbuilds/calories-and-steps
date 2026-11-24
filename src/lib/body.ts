/** Body composition maths: plain BMI and the US Navy body-fat estimate. */

import type { Sex } from './energy';
import { cmToIn } from './units';

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Healthy range';
  if (value < 30) return 'Overweight';
  return 'Obese';
}

/**
 * US Navy body-fat %, using inches and base-10 logs.
 * Returns null when the measurements can't produce a result
 * (e.g. waist not larger than neck).
 */
export function navyBodyFat(input: {
  sex: Sex;
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number | null;
}): number | null {
  const h = cmToIn(input.heightCm);
  const neck = cmToIn(input.neckCm);
  const waist = cmToIn(input.waistCm);
  let pct: number;
  if (input.sex === 'male') {
    if (waist - neck <= 0) return null;
    pct = 86.01 * Math.log10(waist - neck) - 70.041 * Math.log10(h) + 36.76;
  } else {
    if (input.hipCm == null) return null;
    const hip = cmToIn(input.hipCm);
    if (waist + hip - neck <= 0) return null;
    pct = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(h) - 78.387;
  }
  if (!Number.isFinite(pct)) return null;
  return Math.max(0, pct);
}

/** Fat and lean mass in kg from total weight and body-fat %. */
export function bodyComposition(weightKg: number, bodyFatPct: number): { fatKg: number; leanKg: number } {
  const fatKg = (weightKg * bodyFatPct) / 100;
  return { fatKg, leanKg: weightKg - fatKg };
}

/**
 * What a check-in form can save. Measurements are all-or-nothing: either
 * enough to work out body fat, or none at all with at least one photo.
 */
export function checkInReadiness(input: {
  female: boolean;
  neckCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  bodyFatPct: number | null;
  photoCount: number;
}): { ok: true; measured: boolean } | { ok: false; reason: string } {
  const entered = [input.neckCm, input.waistCm, ...(input.female ? [input.hipCm] : [])].filter((v) => v != null).length;
  if (entered === 0) {
    return input.photoCount > 0
      ? { ok: true, measured: false }
      : { ok: false, reason: 'Add measurements, photos or both.' };
  }
  if (input.bodyFatPct == null) {
    const missing = [
      input.neckCm == null ? 'neck' : null,
      input.waistCm == null ? 'waist' : null,
      input.female && input.hipCm == null ? 'hips' : null,
    ].filter(Boolean);
    return {
      ok: false,
      reason: missing.length
        ? `Add your ${missing.join(' and ')} too, or clear the measurements to save photos only.`
        : 'Check the measurements: waist should be bigger than neck.',
    };
  }
  return { ok: true, measured: true };
}

/**
 * When a check-in on a chosen day happened. Editing keeps the original time
 * of day; a new one today uses now, and a new one on an earlier day uses midday.
 */
export function checkInTimestamp(day: Date, opts: { now?: Date; keepTimeOf?: Date } = {}): Date {
  const now = opts.now ?? new Date();
  const at = (h: number, m: number, s = 0) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, s);
  const t = opts.keepTimeOf;
  if (t) return at(t.getHours(), t.getMinutes(), t.getSeconds());
  const today =
    day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth() && day.getDate() === now.getDate();
  return today ? now : at(12, 0);
}
