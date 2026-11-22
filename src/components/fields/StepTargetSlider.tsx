import Slider from '@react-native-community/slider';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { STEP_TARGET } from '@/lib/energy';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export function StepTargetSlider({
  value,
  onChange,
  onComplete,
}: {
  value: number;
  onChange: (steps: number) => void;
  onComplete?: (steps: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text variant="bigMetric" style={styles.value}>
        {value.toLocaleString()}
      </Text>
      <Text variant="label" muted style={styles.value}>
        steps a day
      </Text>
      <Slider
        accessibilityLabel="Daily step target"
        minimumValue={STEP_TARGET.min}
        maximumValue={STEP_TARGET.max}
        step={STEP_TARGET.step}
        value={value}
        onValueChange={onChange}
        onSlidingComplete={onComplete}
        minimumTrackTintColor={colors.steps}
        maximumTrackTintColor={colors.track}
        thumbTintColor={colors.steps}
      />
      <View style={styles.ends}>
        <Text variant="caption" muted>
          {STEP_TARGET.min.toLocaleString()}
        </Text>
        <Text variant="caption" muted>
          {STEP_TARGET.max.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] },
  value: { textAlign: 'center' },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
