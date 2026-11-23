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
