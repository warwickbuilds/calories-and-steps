import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { CaloriesChart } from '@/components/CaloriesChart';
import { FoodIcon } from '@/components/FoodIcon';
import { AddButton, Badge, Card, IconButton, ProgressBar, Screen, SplitBar, Text } from '@/components/ui';
import { useCaloriesWeek, useDayItems, useDayTotals, useTargets } from '@/hooks/data';
import { useToday } from '@/hooks/useToday';
import { addDays, formatLongDate, fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { caloriesSummary, dayLabel, formatAmount, macroLine } from '@/lib/food';
import { MEAL_TYPES, caloriesReadout, formatNumber, isLocalDate, macroSplit } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const weekday = (day: string, today: string) =>
  day === today ? 'Today' : fromLocalDateString(day).toLocaleDateString(undefined, { weekday: 'short' });

/**
 * Calories summary page: today's (or selected day's) calorie & macro breakdown,
 * 7-day average with an interactive 7-day bar chart against the daily target,
 * and a compact logged meals list for browsing or adding to any day.
 */
export default function FoodScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ day?: string }>();
  const today = useToday();
  const day = isLocalDate(params.day) && params.day <= today ? params.day : today;
  const shift = (n: number) => router.setParams({ day: toLocalDateString(addDays(fromLocalDateString(day), n)) });

  const items = useDayItems(day);
  const totals = useDayTotals(day);
  const targets = useTargets();
  const weekHistory = useCaloriesWeek(day);
  const targetCal = targets?.calories ?? 0;
  const summary = caloriesSummary(weekHistory, targetCal);
  const readout = caloriesReadout(totals.calories, targetCal);
  const macros = macroSplit(totals, targets);
  const macroColor = { protein: colors.protein, carbs: colors.carbs, fat: colors.fat };
  const over = readout.over;
  const isToday = day === today;

  const avgOver = summary.avgDelta != null && summary.avgDelta > 0;
  const avgBadgeLabel =
    summary.avgDelta == null
      ? null
      : summary.avgDelta === 0
        ? 'On target'
        : avgOver
          ? `${formatNumber(summary.avgDelta)} over`
          : `${formatNumber(Math.abs(summary.avgDelta))} under`;

  return (
    <Screen
      eyebrow={formatLongDate(fromLocalDateString(day))}
      title={isToday ? 'Calories' : dayLabel(day, today)}
      right={
        <View style={styles.nav}>
          <IconButton icon={ChevronLeft} accessibilityLabel="Previous day" onPress={() => shift(-1)} />
          {day < today ? <IconButton icon={ChevronRight} accessibilityLabel="Next day" onPress={() => shift(1)} /> : null}
        </View>
      }>
      <Card
        title={isToday ? 'Today' : dayLabel(day, today)}
        right={
          targetCal > 0 ? (
            <Badge
              tone={over ? 'danger' : 'calories'}
              dot
              label={`${formatNumber(readout.value)} ${over ? 'over' : 'left'}`}
            />
          ) : undefined
        }>
        <View style={styles.heroRow}>
          <Text variant="bigMetric" color={over ? colors.danger : undefined}>
            {formatNumber(totals.calories)}
          </Text>
          <Text variant="label" muted>
            {targetCal > 0 ? `of ${formatNumber(targetCal)} calories` : 'calories'}
          </Text>
        </View>
        {targetCal > 0 ? (
          <ProgressBar progress={totals.calories / targetCal} color={over ? colors.danger : colors.calories} />
        ) : null}
        <View style={styles.macros}>
          <SplitBar parts={macros.map((m) => ({ share: m.share, color: macroColor[m.key] }))} />
          <View style={styles.macroRow}>
            {macros.map((m) => (
              <View key={m.key} style={styles.macro}>
                <View style={styles.labelRow}>
                  <View style={[styles.dot, { backgroundColor: macroColor[m.key] }]} />
                  <Text variant="caption" muted>
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

      <Card
        title={isToday ? 'Last 7 days' : `7 days to ${dayLabel(day, today)}`}
        right={
          avgBadgeLabel ? (
            <Badge tone={avgOver ? 'danger' : 'calories'} dot label={avgBadgeLabel} />
          ) : undefined
        }>
        <View style={styles.avgBlock}>
          <Text variant="label" muted>
            7-day average
          </Text>
          <View style={styles.heroRow}>
            <Text variant="metric">{summary.average == null ? '–' : formatNumber(summary.average)}</Text>
            <Text variant="label" muted>
              {summary.average == null ? 'nothing logged yet' : 'calories / day'}
            </Text>
          </View>
        </View>

        <CaloriesChart
          bars={weekHistory.map((d) => ({ key: d.day, value: d.calories }))}
          target={targetCal > 0 ? targetCal : null}
          labels={weekHistory.map((d) => weekday(d.day, today))}
          selectedKey={day}
          formatInspect={(b) => ({
            label:
              b.key === today
                ? 'Today'
                : fromLocalDateString(b.key).toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  }),
            value: b.value == null ? 'Not logged' : `${formatNumber(b.value)} calories`,
            over: b.value != null && targetCal > 0 && b.value > targetCal,
          })}
          accessibilityLabel={`Calories for the 7 days ending ${dayLabel(day, today)}. ${weekHistory
            .map((d) => `${weekday(d.day, today)} ${d.calories == null ? 'not logged' : `${formatNumber(d.calories)} calories`}`)
            .join(', ')}.${targetCal > 0 ? ` Target ${formatNumber(targetCal)} calories.` : ''}`}
        />

        {summary.daysLogged > 0 ? (
          <View style={[styles.stats, { borderTopColor: colors.line }]}>
            <View style={styles.stat}>
              <Text variant="caption" muted>
                Logged
              </Text>
              <Text variant="bodyStrong" style={styles.tabular}>
                {summary.daysLogged} / 7 days
              </Text>
            </View>
            {targetCal > 0 ? (
              <>
                <View style={[styles.stat, styles.statBorder, { borderLeftColor: colors.line }]}>
                  <Text variant="caption" muted>
                    On target
                  </Text>
                  <Text variant="bodyStrong" style={styles.tabular}>
                    {summary.daysOnTarget} / {summary.daysLogged}
                  </Text>
                </View>
                <View style={[styles.stat, styles.statBorder, { borderLeftColor: colors.line }]}>
                  <Text variant="caption" muted>
                    Avg vs target
                  </Text>
                  <Text
                    variant="bodyStrong"
                    style={styles.tabular}
                    color={avgOver ? colors.danger : undefined}>
                    {summary.avgDelta == null
                      ? '–'
                      : `${summary.avgDelta > 0 ? '+' : summary.avgDelta < 0 ? '−' : ''}${formatNumber(
                          Math.abs(summary.avgDelta),
                        )}`}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card title={isToday ? 'Today’s meals' : `Meals · ${dayLabel(day, today)}`} style={styles.mealsCard}>
        {MEAL_TYPES.map((m, idx) => {
          const rows = items.filter((i) => i.mealType === m.value);
          const total = rows.reduce((s, r) => s + r.calories, 0);
          return (
            <View
              key={m.value}
              style={[
                styles.mealGroup,
                idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
              ]}>
              <View style={styles.mealHeader}>
                <View style={styles.mealTitle}>
                  <Text variant="bodyStrong">{m.label}</Text>
                  <Text variant="caption" muted style={styles.tabular}>
                    {rows.length > 0 ? `${formatNumber(total)} calories` : 'Not logged'}
                  </Text>
                </View>
                <AddButton
                  icon={Plus}
                  tone="calories"
                  accessibilityLabel={`Add food to ${m.label}`}
                  onPress={() => router.push({ pathname: '/add-food', params: { meal: m.value, day } })}
                />
              </View>
              {rows.map((r) => {
                const line = macroLine(r);
                return (
                  <Pressable
                    key={r.id}
                    accessibilityRole="button"
                    accessibilityHint="Opens it to change or delete"
                    onPress={() => router.push({ pathname: '/food-item', params: { id: String(r.id) } })}
                    style={({ pressed }) => [
                      styles.row,
                      { borderTopColor: colors.line, opacity: pressed ? 0.6 : 1 },
                    ]}>
                    <FoodIcon food={r} size={30} />
                    <View style={styles.rowText}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {r.name}
                      </Text>
                      {r.grams != null || line ? (
                        <Text variant="caption" muted numberOfLines={1}>
                          {r.grams != null ? formatAmount(r.grams, r.unit) : ''}
                          {r.grams != null && line ? ' · ' : ''}
                          {line}
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
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', gap: space[2] },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  avgBlock: { gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macros: { gap: space[2], paddingTop: space[1] },
  macroRow: { flexDirection: 'row', gap: space[3] },
  macro: { flex: 1, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  stats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space[3],
    marginTop: space[1],
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statBorder: { borderLeftWidth: StyleSheet.hairlineWidth },
  mealsCard: { gap: 0 },
  mealGroup: { paddingVertical: space[3], gap: space[2] },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  mealTitle: { flex: 1, gap: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingTop: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 1 },
});
