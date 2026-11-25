import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Cookie, Moon, Plus, Settings, Sun, Sunrise, type LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackupReminder } from '@/components/BackupCard';
import { UpdateBanner } from '@/components/UpdateBanner';
import { WeightLogCard } from '@/components/WeightLogCard';
import { AddButton, ArcGauge, Badge, Card, IconButton, ProgressBar, Screen, SplitBar, Text } from '@/components/ui';
import { copyMeal } from '@/db/meals';
import { useDayTotals, useProfile, useTargets, useWeightTrend } from '@/hooks/data';
import { connectSteps, useDaySteps, useStepsSync } from '@/hooks/steps';
import { useToday } from '@/hooks/useToday';
import { addDays, formatLongDate, fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { takeImportRequest } from '@/lib/onboardingIntent';
import {
  MEAL_TYPES,
  caloriesReadout,
  changeParts,
  formatNumber,
  macroSplit,
  stepsAccessibility,
  stepsToGo,
  todayWeightChanges,
  type MealType,
} from '@/lib/today';
import { toDisplayWeight, weightUnitLabel } from '@/lib/units';
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
      <WeightChangeStrip />
      <CaloriesCard day={today} />
      <StepsCard day={today} />
      <MealsCard day={today} />
      <WeightLogCard />
    </Screen>
  );
}

/** Weigh-in change over 7 days, 1 month and 3 months. Hidden until there are two weigh-ins. */
function WeightChangeStrip() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const trend = useWeightTrend();
  const units = profile?.unitPref ?? 'metric';
  const unit = weightUnitLabel(units);
  const tiles = useMemo(() => todayWeightChanges(trend), [trend]);
  if (trend.length < 2) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens your weight history"
      onPress={() => router.push('/weight')}>
      <Card style={styles.strip}>
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
      </Card>
    </Pressable>
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
        accessibilityLabel={`${formatNumber(cal.value)} calories ${cal.status}. ${formatNumber(
          totals.calories,
        )} eaten of ${formatNumber(target)}.`}>
        <View style={styles.side}>
          <View style={styles.sideLabel}>
            <View style={[styles.dotSmall, { backgroundColor: cal.over ? colors.danger : colors.calories }]} />
            <Text variant="label" muted>
              Eaten
            </Text>
          </View>
          <Text variant="title" style={styles.tabular}>
            {formatNumber(totals.calories)}
          </Text>
        </View>
        <ArcGauge size={168} progress={cal.over ? 1 : cal.remaining} color={cal.over ? colors.danger : colors.calories}>
          <Text variant="bigMetric" color={cal.over ? colors.danger : undefined}>
            {formatNumber(cal.value)}
          </Text>
          <Text variant="label" muted>
            {cal.status}
          </Text>
        </ArcGauge>
        <View style={styles.side}>
          <Text variant="label" muted>
            Target
          </Text>
          <Text variant="title" style={styles.tabular}>
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

function MealsCard({ day }: { day: string }) {
  const { colors } = useTheme();
  const targets = useTargets();
  const totals = useDayTotals(day);
  const yesterday = toLocalDateString(addDays(fromLocalDateString(day), -1));
  const yesterdayTotals = useDayTotals(yesterday);
  const [copying, setCopying] = useState<MealType | null>(null);
  const budget = Math.max(targets?.calories ?? 0, totals.calories, 1);

  const openQuickAdd = (meal: MealType) => router.push({ pathname: '/quick-add', params: { meal, day } });
  const openAddFood = (meal: MealType) => router.push({ pathname: '/add-food', params: { meal, day } });
  const handleCopy = async (meal: MealType) => {
    if (copying) return;
    setCopying(meal);
    try {
      await copyMeal(meal, yesterday, day);
    } finally {
      setCopying(null);
    }
  };

  return (
    <Card style={styles.mealsCard}>
      {MEAL_TYPES.map((m, i) => {
        const t = totals.byMeal[m.value];
        const hadYesterday = yesterdayTotals.byMeal[m.value].count > 0;
        const MealIcon = MEAL_ICONS[m.value];
        const share = t.count > 0 ? Math.min(1, t.calories / budget) : 0;
        return (
          <View
            key={m.value}
            style={[styles.mealRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
            <View style={styles.mealText}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={`Shows what you logged for ${m.label.toLowerCase()}`}
                onPress={() => router.push({ pathname: '/food', params: { day } })}>
                <View style={styles.mealHeading}>
                  <MealIcon size={16} strokeWidth={1.9} color={t.count > 0 ? colors.calories : colors.muted} />
                  <Text variant="bodyMedium">{m.label}</Text>
                </View>
                <Text variant="label" muted style={styles.tabular}>
                  {t.count > 0 ? `${formatNumber(t.calories)} calories` : 'Not logged'}
                </Text>
                {share > 0 ? (
                  <View style={[styles.mealBarTrack, { backgroundColor: colors.track }]}>
                    <View style={[styles.mealBarFill, { width: `${Math.max(6, share * 100)}%`, backgroundColor: colors.calories }]} />
                  </View>
                ) : null}
              </Pressable>
              <View style={styles.pills}>
                {hadYesterday ? (
                  <Pill
                    label="Same as yesterday"
                    accessibilityLabel={`Same ${m.label.toLowerCase()} as yesterday`}
                    disabled={copying === m.value}
                    onPress={() => handleCopy(m.value)}
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
              tone="calories"
              accessibilityLabel={`Add food to ${m.label}`}
              onPress={() => openAddFood(m.value)}
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
  disabled,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}>
      {({ pressed }) => (
        <View style={[styles.pill, { backgroundColor: colors.track, opacity: pressed || disabled ? 0.7 : 1 }]}>
          <Text variant="caption" muted>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  strip: { flexDirection: 'row', paddingVertical: space[3], paddingHorizontal: 0, gap: 0 },
  stripTile: { flex: 1, alignItems: 'center', gap: 2 },
  stripValue: { flexDirection: 'row', alignItems: 'center', gap: 3 },
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
  mealRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
  mealText: { flex: 1, gap: space[2] },
  mealHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealBarTrack: { height: 3, borderRadius: 2, marginTop: 6, maxWidth: 140, overflow: 'hidden' },
  mealBarFill: { height: '100%', borderRadius: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  pill: { height: 28, borderRadius: 14, paddingHorizontal: space[3], justifyContent: 'center' },
});
