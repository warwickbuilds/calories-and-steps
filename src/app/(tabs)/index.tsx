import { router } from 'expo-router';
import { Check, Plus, Settings } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AddButton, Button, Card, DualRings, IconButton, ProgressBar, Screen, Text } from '@/components/ui';
import { copyMeal } from '@/db/meals';
import { logWeightForDay } from '@/db/queries';
import { useDayTotals, useLatestWeight, useProfile, useRecentWeights, useTargets } from '@/hooks/data';
import { addDays, dayBounds, formatLongDate, toLocalDateString } from '@/lib/dates';
import {
  MEAL_TYPES,
  caloriesReadout,
  formatNumber,
  stepsAccessibility,
  weeklyChangeKg,
  weeklyChangeText,
  type MealType,
} from '@/lib/today';
import { fromDisplayWeight, parseDecimal, toDisplayWeight, weightUnitLabel } from '@/lib/units';
import { LIMITS, inRange } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

export default function TodayScreen() {
  const today = toLocalDateString();
  return (
    <Screen
      eyebrow={formatLongDate()}
      title="Today"
      right={<IconButton icon={Settings} accessibilityLabel="Settings" onPress={() => router.push('/settings')} />}>
      <RingsCard day={today} />
      <MacrosCard day={today} />
      <MealsCard day={today} />
      <WeightCard />
    </Screen>
  );
}

function Readout({
  color,
  label,
  value,
  caption,
  valueColor,
  action,
}: {
  color: string;
  label: string;
  value?: string;
  caption?: string;
  valueColor?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.readout}>
      <View style={styles.readoutLabel}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text variant="label" muted>
          {label}
        </Text>
      </View>
      {action ?? (
        <>
          <Text variant="metric" color={valueColor}>
            {value}
          </Text>
          {caption ? (
            <Text variant="caption" muted>
              {caption}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function RingsCard({ day }: { day: string }) {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const targets = useTargets();
  const totals = useDayTotals(day);
  const stepTarget = profile?.stepTarget ?? 10000;
  // Step sync from Apple Health / Health Connect arrives in Phase 4.
  const steps: number | null = null;
  const cal = caloriesReadout(totals.calories, targets?.calories ?? 0);

  const a11y = `${stepsAccessibility(steps, stepTarget)} ${
    cal.over ? `${formatNumber(cal.value)} calories over.` : `${formatNumber(cal.value)} calories left.`
  }`;

  return (
    <Card>
      <View style={styles.ringsRow} accessible accessibilityLabel={a11y}>
        <DualRings steps={steps == null ? 0 : steps / stepTarget} calories={cal.progress} />
        <View style={styles.readouts}>
          {steps == null ? (
            <Readout
              color={colors.steps}
              label="Steps"
              action={
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    Alert.alert(
                      'Connect steps',
                      'Reading steps from Apple Health and Health Connect is coming in an upcoming build.',
                    )
                  }
                  style={styles.connect}>
                  <Text variant="bodyStrong">Connect steps</Text>
                  <Text variant="caption" muted>
                    of {formatNumber(stepTarget)}
                  </Text>
                </Pressable>
              }
            />
          ) : (
            <Readout
              color={colors.steps}
              label="Steps"
              value={formatNumber(steps)}
              caption={`of ${formatNumber(stepTarget)}`}
            />
          )}
          <Readout
            color={colors.calories}
            label="Calories left"
            value={cal.headline}
            valueColor={cal.over ? colors.danger : undefined}
            caption={cal.caption}
          />
        </View>
      </View>
    </Card>
  );
}

function MacrosCard({ day }: { day: string }) {
  const targets = useTargets();
  const totals = useDayTotals(day);
  const rows = [
    { label: 'Protein', eaten: totals.proteinG, target: targets?.proteinG ?? 0 },
    { label: 'Carbs', eaten: totals.carbsG, target: targets?.carbsG ?? 0 },
    { label: 'Fat', eaten: totals.fatG, target: targets?.fatG ?? 0 },
  ];
  return (
    <Card>
      <View style={styles.macros}>
        {rows.map((r) => (
          <View
            key={r.label}
            style={styles.macro}
            accessible
            accessibilityLabel={`${r.label} ${Math.round(r.eaten)} of ${r.target} grams`}>
            <Text variant="label" muted>
              {r.label}
            </Text>
            <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
              {Math.round(r.eaten)}g
              <Text variant="label" muted>
                {' '}
                / {r.target}g
              </Text>
            </Text>
            <ProgressBar progress={r.target ? r.eaten / r.target : 0} />
          </View>
        ))}
      </View>
    </Card>
  );
}

function MealsCard({ day }: { day: string }) {
  const { colors } = useTheme();
  const totals = useDayTotals(day);

  const openQuickAdd = (meal: MealType) => router.push({ pathname: '/quick-add', params: { meal } });

  const sameAsYesterday = async (meal: MealType, label: string) => {
    const yesterday = toLocalDateString(addDays(new Date(), -1));
    const copied = await copyMeal(meal, yesterday, day);
    if (copied === 0) Alert.alert('Nothing to copy', `No ${label.toLowerCase()} was logged yesterday.`);
  };

  const moreOptions = (meal: MealType, label: string) => {
    const options = ['Same as yesterday', 'Quick add', 'Cancel'];
    const pick = (i: number) => {
      if (i === 0) sameAsYesterday(meal, label);
      if (i === 1) openQuickAdd(meal);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 2, title: label }, pick);
    } else {
      Alert.alert(label, undefined, [
        { text: options[0], onPress: () => pick(0) },
        { text: options[1], onPress: () => pick(1) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <Card style={styles.mealsCard}>
      {MEAL_TYPES.map((m, i) => {
        const t = totals.byMeal[m.value];
        return (
          <View
            key={m.value}
            style={[styles.mealRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
            <Pressable
              style={styles.mealText}
              accessibilityRole="button"
              accessibilityHint={`Shows what you logged for ${m.label.toLowerCase()}`}
              onPress={() => router.push({ pathname: '/food', params: { meal: m.value } })}>
              <Text variant="bodyMedium">{m.label}</Text>
              <Text variant="label" muted style={{ fontVariant: ['tabular-nums'] }}>
                {t.count > 0 ? `${formatNumber(t.calories)} calories` : 'Not logged'}
              </Text>
            </Pressable>
            <AddButton
              icon={Plus}
              accessibilityLabel={`Add food to ${m.label}`}
              accessibilityHint="Long press for Same as yesterday"
              onPress={() => openQuickAdd(m.value)}
              onLongPress={() => moreOptions(m.value, m.label)}
            />
          </View>
        );
      })}
    </Card>
  );
}

function WeightCard() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const latest = useLatestWeight();
  const recent = useRecentWeights();
  const units = profile?.unitPref ?? 'metric';
  const unit = weightUnitLabel(units);

  const { start, end } = dayBounds();
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
    const kgChange = weeklyChangeKg(recent);
    return weeklyChangeText(kgChange == null ? null : toDisplayWeight(kgChange, units));
  }, [recent, units]);

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
  ringsRow: { flexDirection: 'row', alignItems: 'center', gap: space[5] },
  readouts: { flex: 1, gap: space[4] },
  readout: { gap: 2 },
  readoutLabel: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connect: { minHeight: layout.minTap, justifyContent: 'center' },
  macros: { flexDirection: 'row', gap: space[4] },
  macro: { flex: 1, gap: space[1] },
  mealsCard: { paddingVertical: space[1], gap: 0 },
  mealRow: { minHeight: 48 + space[2], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  mealText: { flex: 1, minHeight: layout.minTap, justifyContent: 'center', paddingVertical: space[1] },
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
