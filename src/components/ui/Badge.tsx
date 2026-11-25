import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

import { Text } from './Text';

export type BadgeTone = 'neutral' | 'steps' | 'calories' | 'weight' | 'body' | 'danger';

/**
 * Compact tinted status pill. Text stays high-contrast (`text` or `danger`)
 * while the soft background and optional leading dot carry the semantic hue.
 */
export function Badge({
  label,
  tone = 'neutral',
  dot = false,
}: {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  const { colors } = useTheme();
  const map: Record<BadgeTone, { bg: string; accent: string; text?: string }> = {
    neutral: { bg: colors.track, accent: colors.muted },
    steps: { bg: colors.stepsSoft, accent: colors.steps },
    calories: { bg: colors.caloriesSoft, accent: colors.calories },
    weight: { bg: colors.weightSoft, accent: colors.weight },
    body: { bg: colors.bodySoft, accent: colors.body },
    danger: { bg: colors.dangerSoft, accent: colors.danger, text: colors.danger },
  };
  const style = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: style.accent }]} /> : null}
      <Text variant="caption" color={style.text} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1] + 2,
    paddingHorizontal: space[2] + 2,
    paddingVertical: space[1],
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: fonts.medium },
});
