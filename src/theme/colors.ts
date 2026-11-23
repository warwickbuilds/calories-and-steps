/**
 * Colour tokens from the "Rings" design spec. Screens use these names only,
 * never raw hex values. Two accents: steps (green/lime) and calories (orange),
 * used only for steps and calories shapes. In light mode they are not used
 * for text (contrast on white is too low).
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
};

export const palettes = { light, dark };
export type Palette = typeof light;
