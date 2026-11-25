/**
 * Colour tokens from the "Rings" design spec. Screens use these names only,
 * never raw hex values.
 *
 * Semantic discipline:
 * - Steps: green/lime (`steps`, `stepsSoft`) — used ONLY for steps.
 * - Calories: orange (`calories`, `caloriesSoft`) — used ONLY for calories and meal logging.
 * - Weight: cobalt blue (`weight`, `weightSoft`).
 * - Body fat / Progress: plum violet (`body`, `bodySoft`).
 * - Macros: blue (`protein`), violet (`carbs`), amber-gold (`fat`).
 * - Weight milestones: four cycling hues (blue, violet, magenta, crimson).
 * - Chrome & primary actions stay monochrome ink in both light and dark mode
 *   so the data accents lead without competing with buttons or navigation.
 */

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

const light = {
  bg: '#F4F6F4',
  surface: '#FFFFFF',
  cardBorder: '#E5E9E6',
  text: '#0E1111',
  muted: '#5B6360',
  line: '#E3E7E5',
  track: '#ECEFED',
  steps: '#1F9D55',
  stepsSoft: 'rgba(31, 157, 85, 0.11)',
  calories: '#F26A1B',
  caloriesSoft: 'rgba(242, 106, 27, 0.11)',
  weight: '#2F6FDE',
  weightSoft: 'rgba(47, 111, 222, 0.10)',
  body: '#7A4BD6',
  bodySoft: 'rgba(122, 75, 214, 0.10)',
  primary: '#0E1111',
  onPrimary: '#FFFFFF',
  danger: '#C62828',
  dangerSoft: 'rgba(198, 40, 40, 0.10)',
  /** Weight milestones (5, 10, 15, 20 kg...), cycled. Never green or orange. */
  milestone1: '#2F6FDE',
  milestone2: '#7A4BD6',
  milestone3: '#C0307F',
  milestone4: '#B3263E',
  protein: '#2F6FDE',
  carbs: '#8257E5',
  fat: '#D99B00',
};

const dark: typeof light = {
  bg: '#0A0C0B',
  surface: '#151917',
  cardBorder: '#232A26',
  text: '#F2F4F3',
  muted: '#9AA39F',
  line: '#242A27',
  track: '#222825',
  steps: '#B6F24A',
  stepsSoft: 'rgba(182, 242, 74, 0.14)',
  calories: '#FF8A4C',
  caloriesSoft: 'rgba(255, 138, 76, 0.15)',
  weight: '#6EA8FF',
  weightSoft: 'rgba(110, 168, 255, 0.15)',
  body: '#AE8EFF',
  bodySoft: 'rgba(174, 142, 255, 0.15)',
  primary: '#F2F4F3',
  onPrimary: '#0A0C0B',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255, 107, 107, 0.15)',
  milestone1: '#6EA8FF',
  milestone2: '#AE8EFF',
  milestone3: '#F27CC6',
  milestone4: '#FF7F93',
  protein: '#7AA7FF',
  carbs: '#B79BFF',
  fat: '#F2C94C',
};

export const palettes = { light, dark };
export type Palette = typeof light;

/** Colour for the nth milestone (0-based), cycling through four. */
export function milestoneColor(colors: Palette, index: number): string {
  const all = [colors.milestone1, colors.milestone2, colors.milestone3, colors.milestone4];
  return all[index % all.length];
}

/** Returns a soft translucent hex fill (~12% alpha) for a 6-digit hex colour. */
export function softTint(hex: string, alphaHex = '1F'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alphaHex}` : hex;
}
