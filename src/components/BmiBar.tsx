import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const MIN_BMI = 15;
const MAX_BMI = 35;

/**
 * Minimal horizontal BMI spectrum bar (15–35) with a crisp marker dot.
 * Uses calm neutral, cobalt, plum and crimson segments — never steps green or calories orange.
 */
export function BmiBar({ value }: { value: number }) {
  const { colors } = useTheme();
  const clamped = Math.min(MAX_BMI, Math.max(MIN_BMI, value));
  const pct = ((clamped - MIN_BMI) / (MAX_BMI - MIN_BMI)) * 100;

  return (
    <View style={styles.wrap} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.barWrap}>
        <View style={styles.segments}>
          <View style={[styles.seg, { flex: 3.5, backgroundColor: colors.line }]} />
          <View style={[styles.seg, { flex: 6.5, backgroundColor: colors.weight, opacity: 0.75 }]} />
          <View style={[styles.seg, { flex: 5.0, backgroundColor: colors.body, opacity: 0.7 }]} />
          <View style={[styles.seg, { flex: 5.0, backgroundColor: colors.milestone4, opacity: 0.7 }]} />
        </View>
        <View
          style={[
            styles.marker,
            {
              left: `${pct}%`,
              backgroundColor: colors.text,
              borderColor: colors.surface,
            },
          ]}
        />
      </View>
      <View style={styles.ticks}>
        <Text variant="caption" muted>
          18.5
        </Text>
        <Text variant="caption" muted>
          25
        </Text>
        <Text variant="caption" muted>
          30
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] },
  barWrap: { justifyContent: 'center', height: 14 },
  segments: { flexDirection: 'row', height: 6, borderRadius: 3, gap: 2, overflow: 'hidden' },
  seg: { height: '100%', borderRadius: 3 },
  marker: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    marginLeft: -7,
  },
  ticks: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: space[4] },
});
