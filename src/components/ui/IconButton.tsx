import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { layout } from '@/theme/tokens';

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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon size={20} strokeWidth={1.8} color={colors.text} />
    </Pressable>
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
  const bg = tone === 'calories' ? colors.caloriesSoft : colors.track;
  const fg = tone === 'calories' ? colors.calories : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={5}
      style={styles.tap}>
      {({ pressed }) => (
        <View style={[styles.add, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}>
          <Icon size={18} strokeWidth={2.1} color={fg} />
        </View>
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
