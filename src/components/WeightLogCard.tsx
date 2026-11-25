import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { logWeightForDay } from '@/db/queries';
import { useLatestWeight, useProfile, useWeightTrend } from '@/hooks/data';
import { useToday } from '@/hooks/useToday';
import { dayBounds, fromLocalDateString } from '@/lib/dates';
import { hapticSuccess } from '@/lib/haptics';
import { changeParts, todayWeightChanges, weeklyChangeText } from '@/lib/today';
import { fromDisplayWeight, parseDecimal, toDisplayWeight, weightUnitLabel } from '@/lib/units';
import { LIMITS, inRange } from '@/lib/validation';
import { periodChange } from '@/lib/weight';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

/**
 * "Weight today" card with a Log button that becomes a tick once logged.
 * Used on Today (with `showChanges` combining the 7d / 1m / 3m tracking strip)
 * and on the Weight tab.
 */
export function WeightLogCard({ showChanges = false }: { showChanges?: boolean }) {
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

  const tiles = useMemo(() => (showChanges ? todayWeightChanges(trend) : []), [showChanges, trend]);
  const hasStrip = showChanges && trend.length >= 2;

  const change = useMemo(() => {
    if (hasStrip) return null;
    // Same weigh-in based number as the Weight tab's headline and Change card.
    const kgChange = periodChange(trend, 7).kg;
    return weeklyChangeText(kgChange == null ? null : toDisplayWeight(kgChange, units));
  }, [hasStrip, trend, units]);

  const log = async () => {
    if (!valid || kg == null) return;
    await logWeightForDay(kg, start, end);
    hapticSuccess();
    setText(null);
  };

  const done = loggedToday && !dirty;

  return (
    <Card>
      <View style={styles.weightRow}>
        <View style={styles.weightLeft}>
          <View style={styles.labelRow}>
            <View style={[styles.dot, { backgroundColor: colors.weight }]} />
            <Text variant="label" muted>
              Weight today
            </Text>
          </View>
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
            style={[styles.tick, { backgroundColor: colors.weightSoft }]}
            accessible
            accessibilityLabel="Logged today">
            <Check size={20} strokeWidth={2.4} color={colors.weight} />
          </View>
        ) : (
          <Button label="Log" onPress={log} disabled={!valid} accessibilityLabel="Log weight" />
        )}
      </View>

      {hasStrip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens your weight history"
          onPress={() => router.push('/weight')}
          style={({ pressed }) => [
            styles.strip,
            { borderTopColor: colors.line, opacity: pressed ? 0.72 : 1 },
          ]}>
          {tiles.map((t, i) => {
            const parts = changeParts(t.kg == null ? null : toDisplayWeight(t.kg, units));
            const Arrow = parts?.direction === 'down' ? ArrowDown : parts?.direction === 'up' ? ArrowUp : null;
            const a11y = parts
              ? `${t.label}: ${parts.direction === 'same' ? 'no change' : `${parts.amount} ${unit} ${parts.direction}`}${
                  t.partial ? ', since your first weigh-in' : ''
                }`
              : `${t.label}: not enough weigh-ins`;
            return (
              <View
                key={t.label}
                accessible
                accessibilityLabel={a11y}
                style={[styles.stripTile, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line }]}>
                <Text variant="caption" muted>
                  {t.label}
                </Text>
                <View style={styles.stripValue}>
                  {Arrow ? <Arrow size={14} strokeWidth={2.5} color={colors.weight} /> : null}
                  <Text variant="bodyStrong" style={styles.tabular}>
                    {parts ? parts.amount : '–'}
                  </Text>
                  {parts ? (
                    <Text variant="caption" muted>
                      {unit}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  weightLeft: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  weightInputRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  weightInput: { minWidth: 72, padding: 0 },
  tick: {
    width: layout.minTap,
    height: layout.minTap,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strip: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space[3],
    marginTop: space[1],
  },
  stripTile: { flex: 1, alignItems: 'center', gap: 2 },
  stripValue: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tabular: { fontVariant: ['tabular-nums'] },
});
