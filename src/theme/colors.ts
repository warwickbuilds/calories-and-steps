/**
 * Colour tokens from the "Rings" design spec. Screens use these names only,
 * never raw hex values. Two accents: steps (green/lime) and calories (orange),
 * used only for steps and calories shapes. Weight milestones get their own
 * four hues (blue, violet, magenta, crimson). In light mode they are not used
 * for text (contrast on white is too low). Macros (protein, carbs, fat) get
 * three more for the split bar on Today: blue, violet and yellow, never green
 * or orange.
 */

export type ColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | ColorScheme;

const light = {
  bg: '#F6F7F5',
  surface: '#FFFFFF',
  text: '#0E1111',
  muted: '#5B6360',
  line: '#E3E7E5',
  track: '#ECEFED',
  steps: '#1F9D55',
  calories: '#F26A1B',
  primary: '#0E1111',
  onPrimary: '#FFFFFF',
  danger: '#C62828',
  /** Weight milestones (5, 10, 15, 20 kg...), cycled. Never green or orange. */
  milestone1: '#2F6FDE',
  milestone2: '#7A4BD6',
  milestone3: '#C0307F',
  milestone4: '#B3263E',
  protein: '#3B6FD8',
  carbs: '#8A63D2',
  fat: '#D9A400',
};

const dark: typeof light = {
  bg: '#0B0D0C',
  surface: '#161A18',
  text: '#F2F4F3',
  muted: '#9AA39F',
  line: '#242A27',
  track: '#232926',
  steps: '#B6F24A',
  calories: '#FF8A4C',
  primary: '#B6F24A',
  onPrimary: '#0B0D0C',
  danger: '#FF6B6B',
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
