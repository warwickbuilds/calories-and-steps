import { router } from 'expo-router';
import { Cookie, Moon, Plus, Settings, Sun, Sunrise, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackupReminder } from '@/components/BackupCard';
import { FoodIcon } from '@/components/FoodIcon';
import { UpdateBanner } from '@/components/UpdateBanner';
import { WeightLogCard } from '@/components/WeightLogCard';
import { AddButton, ArcGauge, Badge, Card, IconButton, ProgressBar, Screen, SplitBar, Text } from '@/components/ui';
import { useDayItems, useDayTotals, useProfile, useTargets } from '@/hooks/data';
import { connectSteps, useDaySteps, useStepsSync } from '@/hooks/steps';
import { useToday } from '@/hooks/useToday';
import { formatLongDate, fromLocalDateString } from '@/lib/dates';
import { formatAmount, macroLine } from '@/lib/food';
import { hapticSuccess } from '@/lib/haptics';
import { takeImportRequest } from '@/lib/onboardingIntent';
import {
  MEAL_TYPES,
  caloriesReadout,
  formatNumber,
  macroSplit,
  stepsAccessibility,
  stepsToGo,
  type MealType,
} from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

const MEAL_ICONS: Record<MealType, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

export default function TodayScreen() {
  const today = useToday();
  useEffect(() => {
    // Chosen on the last onboarding step.
    if (takeImportRequest()) router.push('/import-weights');
  }, []);
  return (
    <Screen
      eyebrow={formatLongDate(fromLocalDateString(today))}
      title="Today"
      right={<IconButton icon={Settings} accessibilityLabel="Settings" onPress={() => router.push('/settings')} />}>
      <UpdateBanner />
      <BackupReminder />
      <CaloriesCard day={today} />
      <StepsCard day={today} />
      <MealsCard day={today} />
      <WeightLogCard showChanges />
    </Screen>
  );
}

/** Countdown of calories left today, with eaten and target either side and the macro split under it. */
function CaloriesCard({ day }: { day: string }) {
  const { colors } = useTheme();
  const targets = useTargets();
  const totals = useDayTotals(day);
  const target = targets?.calories ?? 0;
  const cal = caloriesReadout(totals.calories, target);
  const macros = macroSplit(totals, targets);
  const macroColor = { protein: colors.protein, carbs: colors.carbs, fat: colors.fat };

  return (
    <Card
      title="Calories"
      right={
        cal.over ? (
          <Badge tone="danger" dot label={`${formatNumber(cal.value)} over`} />
        ) : undefined
      }>
      <View
        style={styles.gaugeRow}
        accessible
        accessibilityLabel={`${formatNumber(totals.calories)} of ${formatNumber(target)} calories eaten, ${formatNumber(
          cal.value,
        )} ${cal.over ? 'over' : 'left'}.`}>
        <View style={styles.side}>
          <View style={styles.sideLabel}>
            <View style={[styles.dotSmall, { backgroundColor: colors.calories }]} />
            <Text variant="caption" muted>
              Eaten
            </Text>
          </View>
          <Text variant="bodyStrong" style={styles.tabular}>
            {formatNumber(totals.calories)}
          </Text>
        </View>
        <ArcGauge progress={cal.remaining} color={cal.over ? colors.danger : colors.calories}>
          <Text variant="bigMetric" color={cal.over ? colors.danger : undefined}>
            {formatNumber(cal.value)}
          </Text>
          <Text variant="caption" muted={!cal.over} color={cal.over ? colors.danger : undefined}>
            {cal.over ? 'calories over' : 'calories left'}
          </Text>
        </ArcGauge>
        <View style={styles.side}>
          <Text variant="caption" muted>
            Target
          </Text>
          <Text variant="bodyStrong" style={styles.tabular}>
            {formatNumber(target)}
          </Text>
        </View>
      </View>

      <View style={styles.macros}>
        <SplitBar parts={macros.map((m) => ({ share: m.share, color: macroColor[m.key] }))} />
        <View style={styles.macroRow}>
          {macros.map((m) => (
            <View
              key={m.key}
              style={styles.macro}
              accessible
              accessibilityLabel={`${m.label} ${m.grams} of ${m.target} grams`}>
              <View style={styles.macroLabel}>
                <View style={[styles.dot, { backgroundColor: macroColor[m.key] }]} />
                <Text variant="label" muted>
                  {m.label}
                </Text>
              </View>
              <Text variant="bodyStrong" style={styles.tabular}>
                {m.grams}g
                <Text variant="caption" muted>
                  {' '}
                  / {m.target}g
                </Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

/** Today's steps against the target, or a Connect button before Health Connect is set up. */
function StepsCard({ day }: { day: string }) {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const stepTarget = profile?.stepTarget ?? 10000;
  const { access } = useStepsSync();
  const synced = useDaySteps(day);
  // Before anything is synced, a connected phone shows 0 rather than "Connect".
  const steps: number | null = synced ?? (access === 'granted' ? 0 : null);
  const prevSteps = useRef<number | null>(steps);

  useEffect(() => {
    const prev = prevSteps.current;
    prevSteps.current = steps;
    if (prev != null && steps != null && prev < stepTarget && steps >= stepTarget) {
      hapticSuccess();
    }
  }, [steps, stepTarget]);

  if (steps == null) {
    return (
      <Card title="Steps">
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Connects Health Connect to read your steps"
          onPress={() => (access == null || access === 'unsupported' ? router.push('/steps') : connectSteps())}
          style={styles.connect}>
          <Text variant="bodyStrong">Connect steps</Text>
          <Text variant="caption" muted>
            Target {formatNumber(stepTarget)} a day
          </Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${stepsAccessibility(steps, stepTarget)} ${stepsToGo(steps, stepTarget)}.`}
      accessibilityHint="Opens your step history"
      onPress={() => router.push('/steps')}>
      <Card
        title="Steps"
        right={<Badge tone="steps" dot label={stepsToGo(steps, stepTarget)} />}>
        <View style={styles.stepsValue}>
          <Text variant="metric">{formatNumber(steps)}</Text>
          <Text variant="label" muted>
            of {formatNumber(stepTarget)}
          </Text>
        </View>
        <ProgressBar progress={stepTarget ? steps / stepTarget : 0} color={colors.steps} />
      </Card>
    </Pressable>
  );
}

/** Today's meals showing every item eaten today, with a clean "+" button per meal. */
function MealsCard({ day }: { day: string }) {
  const { colors } = useTheme();
  const targets = useTargets();
  const items = useDayItems(day);
  const totals = useDayTotals(day);
  const budget = Math.max(targets?.calories ?? 0, totals.calories, 1);

  const openAddFood = (meal: MealType) => router.push({ pathname: '/add-food', params: { meal, day } });

  return (
    <Card style={styles.mealsCard}>
      {MEAL_TYPES.map((m, idx) => {
        const rows = items.filter((i) => i.mealType === m.value);
        const mealTotal = totals.byMeal[m.value].calories;
        const share = Math.min(1, mealTotal / budget);
        const MealIcon = MEAL_ICONS[m.value];
        return (
          <View
            key={m.value}
            style={[
              styles.mealSection,
              idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
            ]}>
            <View style={styles.mealHeader}>
              <Pressable
                style={styles.mealTitleTap}
                accessibilityRole="button"
                accessibilityHint="Opens the calories summary"
                onPress={() => router.push({ pathname: '/food', params: { day } })}>
                <View style={styles.mealHeading}>
                  <MealIcon
                    size={16}
                    strokeWidth={2}
                    color={rows.length > 0 ? colors.calories : colors.muted}
                  />
                  <Text variant="bodyStrong">{m.label}</Text>
                </View>
                <Text variant="label" muted style={styles.tabular}>
                  {rows.length > 0 ? `${formatNumber(mealTotal)} calories` : 'Not logged'}
                </Text>
                {rows.length > 0 ? (
                  <View style={[styles.mealBarTrack, { backgroundColor: colors.track }]}>
                    <View
                      style={[
                        styles.mealBarFill,
                        { backgroundColor: colors.calories, width: `${Math.max(6, Math.round(share * 100))}%` },
                      ]}
                    />
                  </View>
                ) : null}
              </Pressable>
              <AddButton
                icon={Plus}
                tone="calories"
                accessibilityLabel={`Add food to ${m.label}`}
                onPress={() => openAddFood(m.value)}
              />
            </View>

            {rows.length > 0 ? (
              <View style={styles.itemList}>
                {rows.map((r) => {
                  const macros = macroLine(r);
                  return (
                    <Pressable
                      key={r.id}
                      accessibilityRole="button"
                      accessibilityHint="Opens item to edit or delete"
                      onPress={() => router.push({ pathname: '/food-item', params: { id: String(r.id) } })}
                      style={({ pressed }) => [
                        styles.itemRow,
                        { borderTopColor: colors.line, opacity: pressed ? 0.65 : 1 },
                      ]}>
                      <FoodIcon food={r} size={30} />
                      <View style={styles.itemText}>
                        <Text variant="bodyMedium" numberOfLines={1}>
                          {r.name}
                        </Text>
                        {r.grams != null || macros ? (
                          <Text variant="caption" muted numberOfLines={1}>
                            {r.grams != null ? formatAmount(r.grams, r.unit) : ''}
                            {r.grams != null && macros ? ' · ' : ''}
                            {macros}
                          </Text>
                        ) : null}
                      </View>
                      <Text variant="label" style={styles.tabular}>
                        {formatNumber(r.calories)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { flex: 1, alignItems: 'center', gap: 2 },
  sideLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotSmall: { width: 6, height: 6, borderRadius: 3 },
  connect: { minHeight: layout.minTap, justifyContent: 'center' },
  macros: { gap: space[3] },
  macroRow: { flexDirection: 'row', gap: space[3] },
  macro: { flex: 1, gap: 2 },
  macroLabel: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  stepsValue: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  mealsCard: { paddingVertical: space[1], gap: 0 },
  mealSection: { paddingVertical: space[3], gap: space[2] },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  mealTitleTap: { flex: 1, gap: 2 },
  mealHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealBarTrack: { height: 3, borderRadius: 2, marginTop: 4, maxWidth: 140, overflow: 'hidden' },
  mealBarFill: { height: '100%', borderRadius: 2 },
  itemList: { gap: 0 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingTop: space[2],
    marginTop: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemText: { flex: 1, gap: 1 },
});
