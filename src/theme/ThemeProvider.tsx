import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type ColorScheme, type Palette, type ThemePreference } from './colors';

interface ThemeValue {
  scheme: ColorScheme;
  colors: Palette;
}

const ThemeContext = createContext<ThemeValue>({ scheme: 'light', colors: palettes.light });

/** Follows the phone's light/dark setting unless the user overrides it in Settings. */
export function ThemeProvider({
  preference = 'system',
  children,
}: PropsWithChildren<{ preference?: ThemePreference }>) {
  const system = useColorScheme();
  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({ scheme, colors: palettes[scheme] }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
