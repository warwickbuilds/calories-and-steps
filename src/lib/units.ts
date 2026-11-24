/**
 * Everything is stored in metric (kg, cm). These helpers convert for display
 * and input when the user picks imperial.
 */

export type UnitSystem = 'metric' | 'imperial';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inches: number) => inches * CM_PER_IN;

/** Splits centimetres into whole feet and inches (rounded to 1 decimal). */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToIn(cm);
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round((totalInches - feet * 12) * 10) / 10;
  if (inches >= 12) {
    feet += 1;
    inches -= 12;
  }
  return { feet, inches };
}

export const feetInchesToCm = (feet: number, inches: number) => inToCm(feet * 12 + inches);

export const weightUnitLabel = (units: UnitSystem) => (units === 'metric' ? 'kg' : 'lb');
export const lengthUnitLabel = (units: UnitSystem) => (units === 'metric' ? 'cm' : 'in');

/** kg → the user's unit, as a number. */
export const toDisplayWeight = (kg: number, units: UnitSystem) =>
  units === 'metric' ? kg : kgToLb(kg);

/** The user's unit → kg. */
export const fromDisplayWeight = (value: number, units: UnitSystem) =>
  units === 'metric' ? value : lbToKg(value);

export const toDisplayLength = (cm: number, units: UnitSystem) =>
  units === 'metric' ? cm : cmToIn(cm);

export const fromDisplayLength = (value: number, units: UnitSystem) =>
  units === 'metric' ? value : inToCm(value);

export function formatWeight(kg: number, units: UnitSystem): string {
  return `${toDisplayWeight(kg, units).toFixed(1)} ${weightUnitLabel(units)}`;
}

export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet} ft ${Math.round(inches)} in`;
}

/** Parses a user-typed number, accepting a comma as the decimal mark. */
export function parseDecimal(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** "0.8 kg down", "0.3 kg up" or "No change", in the user's unit. */
export function signedWeight(kg: number, units: UnitSystem): string {
  const v = Math.round(toDisplayWeight(Math.abs(kg), units) * 10) / 10;
  if (v === 0) return 'No change';
  return `${v.toFixed(1)} ${weightUnitLabel(units)} ${kg < 0 ? 'down' : 'up'}`;
}
