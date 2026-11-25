/**
 * Colour tokens from the "Rings" design spec. Screens use these names only,
 * never raw hex values.
 *
 * Semantic discipline (enforced in every theme by src/theme/__tests__/colors.test.ts):
 * - Steps: green/lime (`steps`, `stepsSoft`) — used ONLY for steps.
 * - Calories: orange (`calories`, `caloriesSoft`) — used ONLY for calories and meal logging.
 * - Weight: cobalt blue (`weight`, `weightSoft`).
 * - Body fat / Progress: plum violet (`body`, `bodySoft`).
 * - Macros: blue (`protein`), violet (`carbs`), amber-gold (`fat`).
 * - Weight milestones: four cycling hues (blue, violet, magenta, crimson).
 * - Chrome & primary actions stay monochrome ink in every theme
 *   so the data accents lead without competing with buttons or navigation.
 */

export type ColorScheme = 'light' | 'dark';
export type ThemeId = 'light' | 'stone' | 'dark' | 'oled';
export type ThemePreference = 'system' | ThemeId;

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

/** Warm paper / linen light theme — calm, low-glare daylight surfaces. */
const stone: typeof light = {
  bg: '#F4F1EA',
  surface: '#FCFBF8',
  cardBorder: '#E5DFD3',
  text: '#1A1815',
  muted: '#6B645A',
  line: '#E6E0D5',
  track: '#EAE4D9',
  steps: '#1F9D55',
  stepsSoft: 'rgba(31, 157, 85, 0.12)',
  calories: '#F26A1B',
  caloriesSoft: 'rgba(242, 106, 27, 0.12)',
  weight: '#2B66CC',
  weightSoft: 'rgba(43, 102, 204, 0.11)',
  body: '#7546CC',
  bodySoft: 'rgba(117, 70, 204, 0.11)',
  primary: '#1A1815',
  onPrimary: '#FCFBF8',
  danger: '#C22B2B',
  dangerSoft: 'rgba(194, 43, 43, 0.11)',
  milestone1: '#2B66CC',
  milestone2: '#7546CC',
  milestone3: '#B8307A',
  milestone4: '#AD263D',
  protein: '#2B66CC',
  carbs: '#7B52DB',
  fat: '#D19400',
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

/** Pure OLED black dark theme — 0-nit background with deep charcoal cards. */
const oled: typeof light = {
  ...dark,
  bg: '#000000',
  surface: '#0F1110',
  cardBorder: '#1E2421',
  text: '#F5F7F6',
  muted: '#949E99',
  line: '#1E2421',
  track: '#1A1F1C',
  primary: '#F5F7F6',
  onPrimary: '#000000',
};

export const palettes: Record<ThemeId, typeof light> = { light, stone, dark, oled };
export type Palette = typeof light;

export const THEME_SCHEME: Record<ThemeId, ColorScheme> = {
  light: 'light',
  stone: 'light',
  dark: 'dark',
  oled: 'dark',
};

export const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Matches your phone’s light or dark mode' },
  { value: 'light', label: 'Light', hint: 'Crisp off-white canvas with white cards' },
  { value: 'stone', label: 'Stone', hint: 'Warm linen paper tones for softer daylight reading' },
  { value: 'dark', label: 'Dark', hint: 'Deep forest charcoal' },
  { value: 'oled', label: 'OLED', hint: 'True black background for AMOLED screens' },
];

export function resolveTheme(
  preference: ThemePreference | string | null | undefined,
  systemScheme: ColorScheme | null | undefined,
): { themeId: ThemeId; scheme: ColorScheme; colors: Palette } {
  const themeId: ThemeId =
    preference && preference !== 'system' && preference in palettes
      ? (preference as ThemeId)
      : systemScheme === 'dark'
        ? 'dark'
        : 'light';
  return { themeId, scheme: THEME_SCHEME[themeId], colors: palettes[themeId] };
}

/** Colour for the nth milestone (0-based), cycling through four. */
export function milestoneColor(colors: Palette, index: number): string {
  const all = [colors.milestone1, colors.milestone2, colors.milestone3, colors.milestone4];
  return all[index % all.length];
}

/** Returns a soft translucent hex fill (~12% alpha) for a 6-digit hex colour. */
export function softTint(hex: string, alphaHex = '1F'): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alphaHex}` : hex;
}
