import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

import { Text } from './Text';

const SPRING = { damping: 18, stiffness: 360, mass: 0.6 };

/** Pill button: height 44, radius 22, primary fill with subtle spring press and haptic tap. */
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
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const bg = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.track : 'transparent';
  const fg = variant === 'primary' ? colors.onPrimary : colors.text;
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: !!(disabled || loading) }}
        onPressIn={() => {
          if (!reduced) scale.set(withSpring(0.97, SPRING));
        }}
        onPressOut={() => {
          if (!reduced) scale.set(withSpring(1, SPRING));
        }}
        onPress={() => {
          hapticTap();
          onPress();
        }}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.base,
          { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
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
    </Animated.View>
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
