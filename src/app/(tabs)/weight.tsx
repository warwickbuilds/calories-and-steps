import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/LineChart';
import { WeightLogCard } from '@/components/WeightLogCard';
import { Button, Card, Screen, Segmented, Text } from '@/components/ui';
import { allWeightsQuery, deleteWeight } from '@/db/queries';
import { useProfile, useWeightTrend } from '@/hooks/data';
import { bmi, bmiCategory } from '@/lib/body';
import { formatShortDate, fromLocalDateString } from '@/lib/dates';
import { formatWeight, toDisplayWeight, weightUnitLabel, type UnitSystem } from '@/lib/units';
import {
  RANGE_DAYS,
  changeRows,
  inRange,
  projectGoal,
  rateNeededPerWeek,
  type WeightRange,
} from '@/lib/weight';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

const RANGES = (Object.keys(RANGE_DAYS) as WeightRange[]).map((r) => ({ value: r, label: r }));

/** "0.8 down", "0.3 up", "No change" in the user's unit. */
function signed(kg: number, units: UnitSystem): string {
  const v = Math.round(toDisplayWeight(Math.abs(kg), units) * 10) / 10;
  if (v === 0) return 'No change';
  return `${v.toFixed(1)} ${weightUnitLabel(units)} ${kg < 0 ? 'down' : 'up'}`;
}

export default function WeightScreen() {
  const { profile } = useProfile();
  const trend = useWeightTrend();
  const [range, setRange] = useState<WeightRange>('1M');
  const units = profile?.unitPref ?? 'metric';
  const latest = trend[trend.length - 1];

  return (
    <Screen title="Weight">
      <WeightLogCard />

      <Card>
        <Segmented value={range} onChange={setRange} options={RANGES} />
        <WeightChart range={range} units={units} goalKg={profile?.goalWeightKg ?? null} />
      </Card>

      {trend.length > 0 ? <ChangeCards units={units} /> : null}

      <GoalCard />

      {latest && profile ? (
        <Card title="BMI">
          <Text variant="metric">{bmi(latest.trend, profile.heightCm).toFixed(1)}</Text>
          <Text variant="label" muted>
            {bmiCategory(bmi(latest.trend, profile.heightCm))}, from your trend weight and height
          </Text>
        </Card>
      ) : null}

      <History units={units} />
    </Screen>
  );
}

function WeightChart({ range, units, goalKg }: { range: WeightRange; units: UnitSystem; goalKg: number | null }) {
  const trend = useWeightTrend();
  const points = useMemo(
    () =>
      inRange(trend, range).map((p) => ({
        t: fromLocalDateString(p.day).getTime(),
        value: toDisplayWeight(p.kg, units),
        trend: toDisplayWeight(p.trend, units),
      })),
    [trend, range, units],
  );
  const goal = goalKg == null ? null : toDisplayWeight(goalKg, units);
  // Only show the goal line when it's near the data, so it doesn't flatten the chart.
  const values = points.map((p) => p.value);
  const showGoal =
    goal != null && values.length > 0 && goal >= Math.min(...values) - 5 && goal <= Math.max(...values) + 5;
  const last = points[points.length - 1];
  return (
    <LineChart
      points={points}
      goal={showGoal ? goal : null}
      formatValue={(v) => `${v.toFixed(1)}`}
      formatDate={(t) => formatShortDate(new Date(t), range === '1Y' || range === 'All')}
      accessibilityLabel={
        last
          ? `Weight chart, ${range}. Trend ${last.trend?.toFixed(1)} ${weightUnitLabel(units)}.`
          : `Weight chart, ${range}. No entries.`
      }
    />
  );
}

function ChangeCards({ units }: { units: UnitSystem }) {
  const trend = useWeightTrend();
  const rows = changeRows(trend);
  return (
    <Card title="Change">
      <View style={styles.grid}>
        {rows.map((r) => (
          <View key={r.label} style={styles.cell}>
            <Text variant="label" muted>
              {r.label}
            </Text>
            <Text variant="bodyStrong" style={styles.tabular}>
              {r.kg == null ? '–' : signed(r.kg, units)}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" muted>
        Based on your trend line, which smooths out day-to-day swings.
      </Text>
    </Card>
  );
}

function GoalCard() {
  const { profile } = useProfile();
  const trend = useWeightTrend();
  if (!profile) return null;
  const units = profile.unitPref;
  const latest = trend[trend.length - 1];
  const goal = profile.goalWeightKg;

  if (goal == null) {
    return (
      <Card title="Goal">
        <Text variant="label" muted>
          Set a goal weight to see when you’re on track to reach it.
        </Text>
        <Button variant="secondary" label="Set a goal" onPress={() => router.push('/settings')} />
      </Card>
    );
  }

  const p = projectGoal(trend, goal);
  const toGo = latest ? goal - latest.trend : null;
  let headline: string;
  let detail: string | null = null;
  switch (p.kind) {
    case 'reached':
      headline = 'Goal reached';
      break;
    case 'on-track':
      headline = p.date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      detail = `At your current rate, about ${Math.round(p.days / 7)} weeks from now.`;
      break;
    case 'wrong-way':
      headline = 'Not heading there yet';
      detail = 'Your trend over the last four weeks is flat or moving away from your goal.';
      break;
    default:
      headline = 'Keep logging';
      detail = 'A projection appears after about a week of weigh-ins.';
  }
  const rate =
    profile.goalDate && latest ? rateNeededPerWeek(latest.trend, goal, profile.goalDate) : null;

  return (
    <Card title="Goal" right={<Text variant="label" muted>{formatWeight(goal, units)}</Text>}>
      <View>
        <Text variant="label" muted>
          {p.kind === 'on-track' ? 'Projected date' : 'Projection'}
        </Text>
        <Text variant="metric">{headline}</Text>
        {detail ? (
          <Text variant="label" muted>
            {detail}
          </Text>
        ) : null}
      </View>
      {toGo != null && p.kind !== 'reached' ? (
        <Text variant="label" muted>
          {signed(toGo, units).replace('down', 'to lose').replace('up', 'to gain')}
        </Text>
      ) : null}
      {profile.goalDate ? (
        <Text variant="label" muted>
          {rate == null
            ? 'Your target date has passed.'
            : `To reach it by ${fromLocalDateString(profile.goalDate).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'long',
              })}, you need ${Math.abs(toDisplayWeight(rate, units)).toFixed(2)} ${weightUnitLabel(units)} a week.`}
        </Text>
      ) : null}
    </Card>
  );
}

function History({ units }: { units: UnitSystem }) {
  const { colors } = useTheme();
  const { data: entries = [] } = useLiveQuery(allWeightsQuery());
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? entries : entries.slice(0, 7);
  return (
    <Card title="History">
      {entries.length === 0 ? (
        <Text variant="label" muted>
          Log your weight above to start your chart.
        </Text>
      ) : null}
      {shown.map((e) => (
        <View key={e.id} style={[styles.row, { borderTopColor: colors.line }]}>
          <Text variant="bodyMedium" style={styles.flex}>
            {new Date(e.measuredAt).toLocaleDateString(undefined, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          <Text variant="bodyStrong" style={styles.tabular}>
            {formatWeight(e.weightKg, units)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this entry"
            style={styles.delete}
            onPress={() =>
              Alert.alert('Delete this entry?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteWeight(e.id) },
              ])
            }>
            <Trash2 size={18} strokeWidth={1.8} color={colors.muted} />
          </Pressable>
        </View>
      ))}
      {entries.length > 7 ? (
        <Button
          variant="ghost"
          label={showAll ? 'Show fewer' : `Show all ${entries.length}`}
          onPress={() => setShowAll(!showAll)}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space[3] },
  cell: { width: '50%', gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingTop: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  delete: { width: layout.minTap, height: layout.minTap, alignItems: 'center', justifyContent: 'center' },
});
