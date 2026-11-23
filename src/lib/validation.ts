/** Sensible input ranges, in metric. */

export const LIMITS = {
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
  age: { min: 16, max: 100 },
} as const;

export const inRange = (n: number | null | undefined, r: { min: number; max: number }) =>
  n != null && Number.isFinite(n) && n >= r.min && n <= r.max;
