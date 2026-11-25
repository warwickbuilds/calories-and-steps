import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { hapticTap } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

const SPRING = { damping: 18, stiffness: 420, mass: 0.55 };

/** Round 44×44 icon button, surface fill with a 1px line border. */
export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => {
          if (!reduced) scale.set(withSpring(0.92, SPRING));
        }}
        onPressOut={() => {
          if (!reduced) scale.set(withSpring(1, SPRING));
        }}
        onPress={() => {
          hapticTap();
          onPress();
        }}
        style={({ pressed }) => [
          styles.round,
          { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.8 : 1 },
        ]}>
        <Icon size={20} strokeWidth={1.8} color={colors.text} />
      </Pressable>
    </Animated.View>
  );
}

/** 34×34 "+" circle with a 44×44 tap area. Use tone="calories" only on meal/food add actions. */
export function AddButton({
  icon: Icon,
  onPress,
  onLongPress,
  tone = 'neutral',
  accessibilityLabel,
  accessibilityHint,
}: {
  icon: LucideIcon;
  onPress: () => void;
  onLongPress?: () => void;
  tone?: 'neutral' | 'calories';
  accessibilityLabel: string;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const bg = tone === 'calories' ? colors.caloriesSoft : colors.track;
  const fg = tone === 'calories' ? colors.calories : colors.text;
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPressIn={() => {
        if (!reduced) scale.set(withSpring(0.88, SPRING));
      }}
      onPressOut={() => {
        if (!reduced) scale.set(withSpring(1, SPRING));
      }}
      onPress={() => {
        hapticTap();
        onPress();
      }}
      onLongPress={onLongPress}
      hitSlop={5}
      style={styles.tap}>
      {({ pressed }) => (
        <Animated.View style={[styles.add, animStyle, { backgroundColor: bg, opacity: pressed ? 0.82 : 1 }]}>
          <Icon size={18} strokeWidth={2.1} color={fg} />
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: layout.minTap,
    height: layout.minTap,
    borderRadius: layout.minTap / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  add: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
