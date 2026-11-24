import { Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { logWeightForDay } from '@/db/queries';
import { useLatestWeight, useProfile, useWeightTrend } from '@/hooks/data';
import { useToday } from '@/hooks/useToday';
import { dayBounds, fromLocalDateString } from '@/lib/dates';
import { weeklyChangeText } from '@/lib/today';
import { fromDisplayWeight, parseDecimal, toDisplayWeight, weightUnitLabel } from '@/lib/units';
import { LIMITS, inRange } from '@/lib/validation';
import { periodChange } from '@/lib/weight';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

/** "Weight today" card with a Log button that becomes a tick once logged. Used on Today and Weight. */
export function WeightLogCard() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const latest = useLatestWeight();
  const trend = useWeightTrend();
  const today = useToday();
  const units = profile?.unitPref ?? 'metric';
  const unit = weightUnitLabel(units);

  const { start, end } = useMemo(() => dayBounds(fromLocalDateString(today)), [today]);
  const loggedToday =
    !!latest && latest.measuredAt >= start.toISOString() && latest.measuredAt < end.toISOString();

  const prefill = latest ? toDisplayWeight(latest.weightKg, units).toFixed(1) : '';
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? prefill;
  const parsed = parseDecimal(shown);
  const kg = parsed == null ? null : fromDisplayWeight(parsed, units);
  const valid = inRange(kg, LIMITS.weightKg);
  const dirty = text != null && text !== prefill;

  const change = useMemo(() => {
    // Same weigh-in based number as the Weight tab's headline and Change card.
    const kgChange = periodChange(trend, 7).kg;
    return weeklyChangeText(kgChange == null ? null : toDisplayWeight(kgChange, units));
  }, [trend, units]);

  const log = async () => {
    if (!valid || kg == null) return;
    await logWeightForDay(kg, start, end);
    setText(null);
  };

  const done = loggedToday && !dirty;

  return (
    <Card>
      <View style={styles.weightRow}>
        <View style={styles.weightLeft}>
          <Text variant="label" muted>
            Weight today
          </Text>
          <View style={styles.weightInputRow}>
            <TextInput
              value={shown}
              onChangeText={setText}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={log}
              selectTextOnFocus
              placeholder="0.0"
              placeholderTextColor={colors.muted}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              accessibilityLabel={`Weight today in ${unit === 'kg' ? 'kilograms' : 'pounds'}`}
              style={[typeScale.metric, styles.weightInput, { color: valid || shown === '' ? colors.text : colors.danger }]}
            />
            <Text variant="label" muted>
              {unit}
            </Text>
          </View>
          {change ? (
            <Text variant="caption" muted>
              {change}
            </Text>
          ) : null}
        </View>
        {done ? (
          <View
            style={[styles.tick, { backgroundColor: colors.track }]}
            accessible
            accessibilityLabel="Logged today">
            <Check size={20} strokeWidth={2.2} color={colors.text} />
          </View>
        ) : (
          <Button label="Log" onPress={log} disabled={!valid} accessibilityLabel="Log weight" />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  weightLeft: { flex: 1, gap: 2 },
  weightInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  weightInput: { minWidth: 72, padding: 0 },
  tick: {
    width: layout.minTap,
    height: layout.minTap,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
