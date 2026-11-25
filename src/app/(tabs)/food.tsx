import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FoodIcon } from '@/components/FoodIcon';
import { AddButton, Badge, Card, IconButton, ProgressBar, Screen, SplitBar, Text } from '@/components/ui';
import { copyMeal } from '@/db/meals';
import { useDayItems, useDayTotals, useTargets, useWeekAverage } from '@/hooks/data';
import { useToday } from '@/hooks/useToday';
import { addDays, formatLongDate, fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { dayLabel, formatAmount, macroLine } from '@/lib/food';
import { MEAL_TYPES, formatNumber, isLocalDate, macroSplit, type MealType } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Food log, one day at a time, with the 7-day average. */
export default function FoodScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ day?: string }>();
  const today = useToday();
  const [copying, setCopying] = useState<MealType | null>(null);
  // The day lives in the route, so Today can open a given day and the tab remembers it.
  const day = isLocalDate(params.day) && params.day <= today ? params.day : today;
  const shift = (n: number) => router.setParams({ day: toLocalDateString(addDays(fromLocalDateString(day), n)) });
  const prevDay = toLocalDateString(addDays(fromLocalDateString(day), -1));
  const prevLabel = dayLabel(prevDay, today);
  const items = useDayItems(day);
  const totals = useDayTotals(day);
  const prevTotals = useDayTotals(prevDay);
  const targets = useTargets();
  const week = useWeekAverage(day);
  const macros = macroSplit(totals, targets);
  const macroColor = { protein: colors.protein, carbs: colors.carbs, fat: colors.fat };
  const targetCal = targets?.calories ?? 0;
  const over = targetCal > 0 && totals.calories > targetCal;

  const handleCopy = async (mealType: MealType) => {
    if (copying) return;
    setCopying(mealType);
    try {
      await copyMeal(mealType, prevDay, day);
    } finally {
      setCopying(null);
    }
  };

  return (
    <Screen
      eyebrow={formatLongDate(fromLocalDateString(day))}
      title={dayLabel(day, today)}
      right={
        <View style={styles.nav}>
          <IconButton icon={ChevronLeft} accessibilityLabel="Previous day" onPress={() => shift(-1)} />
          {day < today ? <IconButton icon={ChevronRight} accessibilityLabel="Next day" onPress={() => shift(1)} /> : null}
        </View>
      }>
      <Card>
        <View style={styles.summary}>
          <View style={styles.summaryCol}>
            <View style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: over ? colors.danger : colors.calories }]} />
              <Text variant="label" muted>
                Eaten
              </Text>
            </View>
            <Text variant="metric" color={over ? colors.danger : undefined}>
              {formatNumber(totals.calories)}
            </Text>
            <Text variant="caption" muted>
              {targets ? `of ${formatNumber(targets.calories)} calories` : 'calories'}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text variant="label" muted>
              7-day average
            </Text>
            <Text variant="metric">{week ? formatNumber(week.average) : '–'}</Text>
            <Text variant="caption" muted>
              {week ? `calories, ${week.daysLogged} ${week.daysLogged === 1 ? 'day' : 'days'} logged` : 'Nothing logged yet'}
            </Text>
          </View>
        </View>
        {targetCal > 0 ? (
          <ProgressBar progress={totals.calories / targetCal} color={over ? colors.danger : colors.calories} />
        ) : null}
        {totals.calories > 0 ? (
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
        ) : null}
      </Card>

      {MEAL_TYPES.map((m) => {
        const rows = items.filter((i) => i.mealType === m.value);
        const total = rows.reduce((s, r) => s + r.calories, 0);
        const canCopy = rows.length === 0 && prevTotals.byMeal[m.value].count > 0;
        return (
          <Card
            key={m.value}
            title={m.label}
            right={
              <View style={styles.cardRight}>
                {rows.length ? (
                  <Badge tone="calories" label={`${formatNumber(total)} calories`} />
                ) : (
                  <Text variant="label" muted>
                    Not logged
                  </Text>
                )}
                <AddButton
                  icon={Plus}
                  tone="calories"
                  accessibilityLabel={`Add food to ${m.label}`}
                  onPress={() => router.push({ pathname: '/add-food', params: { meal: m.value, day } })}
                />
              </View>
            }>
            {rows.map((r) => {
              const macros = macroLine(r);
              return (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityHint="Opens it to change or delete"
                  onPress={() => router.push({ pathname: '/food-item', params: { id: String(r.id) } })}
                  style={({ pressed }) => [styles.row, { borderTopColor: colors.line, opacity: pressed ? 0.6 : 1 }]}>
                  <FoodIcon food={r} />
                  <View style={styles.rowText}>
                    <Text variant="bodyMedium">{r.name}</Text>
                    <Text variant="caption" muted>
                      {formatNumber(r.calories)} calories
                      {r.grams != null ? ` · ${formatAmount(r.grams, r.unit)}` : ''}
                      {macros ? ` · ${macros}` : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {canCopy ? (
              <Pressable
                accessibilityRole="button"
                disabled={copying === m.value}
                onPress={() => handleCopy(m.value)}
                hitSlop={{ top: 8, bottom: 8 }}
                style={({ pressed }) => [
                  styles.pill,
                  { backgroundColor: colors.track, opacity: pressed || copying === m.value ? 0.7 : 1 },
                ]}>
                <Text variant="caption" muted>
                  {prevLabel === 'Yesterday' ? 'Same as yesterday' : `Same as ${prevLabel}`}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', gap: space[2] },
  summary: { flexDirection: 'row', gap: space[4] },
  summaryCol: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macros: { gap: space[2], paddingTop: space[1] },
  macroRow: { flexDirection: 'row', gap: space[3] },
  macro: { flex: 1, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingTop: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  pill: { alignSelf: 'flex-start', height: 28, borderRadius: 14, paddingHorizontal: space[3], justifyContent: 'center' },
});
