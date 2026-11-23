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

/** 32×32 "+" circle with a 44×44 tap area. */
export function AddButton({
  icon: Icon,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
}: {
  icon: LucideIcon;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={6}
      style={styles.tap}>
      {({ pressed }) => (
        <View style={[styles.add, { backgroundColor: colors.track, opacity: pressed ? 0.7 : 1 }]}>
          <Icon size={18} strokeWidth={1.8} color={colors.text} />
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
  tap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  add: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
