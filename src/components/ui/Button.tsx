import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

import { Text } from './Text';

/** Pill button: height 44, radius 22, primary fill. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon: Icon,
  accessibilityLabel,
}: {
  label?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const bg = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.track : 'transparent';
  const fg = variant === 'primary' ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!(disabled || loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : Icon ? (
        <Icon size={20} strokeWidth={2.2} color={fg} />
      ) : (
        <Text variant="bodyStrong" color={fg}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTap,
    minWidth: layout.minTap,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[5],
  },
});
