import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import {
  palettes,
  resolveTheme,
  type ColorScheme,
  type Palette,
  type ThemeId,
  type ThemePreference,
} from './colors';

interface ThemeValue {
  themeId: ThemeId;
  scheme: ColorScheme;
  colors: Palette;
}

const ThemeContext = createContext<ThemeValue>({
  themeId: 'light',
  scheme: 'light',
  colors: palettes.light,
});

/** Follows the phone's light/dark setting unless the user picks a theme in Settings. */
export function ThemeProvider({
  preference = 'system',
  children,
}: PropsWithChildren<{ preference?: ThemePreference }>) {
  const system = useColorScheme();
  const value = useMemo(
    () => resolveTheme(preference, system === 'dark' ? 'dark' : 'light'),
    [preference, system],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
