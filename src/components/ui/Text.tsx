import { Text as RNText, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, type as typeScale, type TypeVariant } from '@/theme/tokens';

export function Text({
  variant = 'body',
  muted,
  color,
  style,
  ...rest
}: TextProps & { variant?: TypeVariant; muted?: boolean; color?: string }) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[typeScale[variant], { color: color ?? (muted ? colors.muted : colors.text) }, style]}
      {...rest}
    />
  );
}
