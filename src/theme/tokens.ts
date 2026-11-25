/**
 * Type, spacing and shape tokens from the "Rings" design spec.
 * Colours live in ./colors.ts.
 */

import type { TextStyle } from 'react-native';

export * from './colors';

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  metric: 'SpaceGrotesk_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** 4-point spacing scale. */
export const space = { 1: 4, 2: 8, 3: 12, 3.5: 14, 4: 16, 5: 20, 6: 24, 7: 28 } as const;

export const layout = {
  screenPadding: 20,
  cardGap: 14,
  cardRadius: 24,
  cardPadding: 18,
  tabBarHeight: 72,
  minTap: 44,
} as const;

export const radius = { sm: 8, md: 14, card: 24, pill: 999 } as const;

/** Respect the phone's text size setting up to 1.3×. */
export const MAX_FONT_SCALE = 1.3;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  metric: { fontFamily: fonts.metric, fontSize: 26, lineHeight: 30, letterSpacing: -0.5, ...tabular },
  bigMetric: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, letterSpacing: -1.1, ...tabular },
  title: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 20 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, textTransform: 'uppercase' },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, ...tabular },
} satisfies Record<string, TextStyle>;
export type TypeVariant = keyof typeof type;
