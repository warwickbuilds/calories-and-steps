import { router } from 'expo-router';
import { Plus, Settings } from 'lucide-react-native';
import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { UpdateBanner } from '@/components/UpdateBanner';
import { WeightLogCard } from '@/components/WeightLogCard';
import { AddButton, Card, DualRings, IconButton, ProgressBar, Screen, Text } from '@/components/ui';
import { copyMeal } from '@/db/meals';
import { useDayTotals, useProfile, useTargets } from '@/hooks/data';
import { addDays, formatLongDate, fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { takeImportRequest } from '@/lib/onboardingIntent';
import { MEAL_TYPES, caloriesReadout, formatNumber, stepsAccessibility, type MealType } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

export default function TodayScreen() {
  const today = toLocalDateString();
  useEffect(() => {
    // Chosen on the last onboarding step.
    if (takeImportRequest()) router.push('/import-weights');
  }, []);
  return (
    <Screen
      eyebrow={formatLongDate()}
      title="Today"
      right={<IconButton icon={Settings} accessibilityLabel="Settings" onPress={() => router.push('/settings')} />}>
      <UpdateBanner />
      <RingsCard day={today} />
      <MacrosCard day={today} />
      <MealsCard day={today} />
      <WeightLogCard />
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
  const yesterday = toLocalDateString(addDays(fromLocalDateString(day), -1));
  const yesterdayTotals = useDayTotals(yesterday);

  // Full add-food flow (photo, barcode, search) arrives in Phase 3; until then + opens quick add.
  const openQuickAdd = (meal: MealType) => router.push({ pathname: '/quick-add', params: { meal } });

  return (
    <Card style={styles.mealsCard}>
      {MEAL_TYPES.map((m, i) => {
        const t = totals.byMeal[m.value];
        const hadYesterday = yesterdayTotals.byMeal[m.value].count > 0;
        return (
          <View
            key={m.value}
            style={[styles.mealRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
            <View style={styles.mealText}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={`Shows what you logged for ${m.label.toLowerCase()}`}
                onPress={() => router.push({ pathname: '/food', params: { meal: m.value } })}>
                <Text variant="bodyMedium">{m.label}</Text>
                <Text variant="label" muted style={{ fontVariant: ['tabular-nums'] }}>
                  {t.count > 0 ? `${formatNumber(t.calories)} calories` : 'Not logged'}
                </Text>
              </Pressable>
              <View style={styles.pills}>
                {hadYesterday ? (
                  <Pill
                    label="Same as yesterday"
                    accessibilityLabel={`Same ${m.label.toLowerCase()} as yesterday`}
                    onPress={() => copyMeal(m.value, yesterday, day)}
                  />
                ) : null}
                <Pill
                  label="Quick add"
                  accessibilityLabel={`Quick add to ${m.label}`}
                  onPress={() => openQuickAdd(m.value)}
                />
              </View>
            </View>
            <AddButton
              icon={Plus}
              accessibilityLabel={`Add food to ${m.label}`}
              onPress={() => openQuickAdd(m.value)}
            />
          </View>
        );
      })}
    </Card>
  );
}

/** Small pill: 28 tall, caption text in muted on a track fill, 44 tap area. */
function Pill({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}>
      {({ pressed }) => (
        <View style={[styles.pill, { backgroundColor: colors.track, opacity: pressed ? 0.7 : 1 }]}>
          <Text variant="caption" muted>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
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
  mealRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
  mealText: { flex: 1, gap: space[2] },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  pill: { height: 28, borderRadius: 14, paddingHorizontal: space[3], justifyContent: 'center' },
});
