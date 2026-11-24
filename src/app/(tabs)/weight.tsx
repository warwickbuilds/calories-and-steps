import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { WeightChart } from '@/components/WeightChart';
import { WeightLogCard } from '@/components/WeightLogCard';
import { Button, Card, Screen, Segmented, Text } from '@/components/ui';
import { allWeightsQuery, deleteWeight } from '@/db/queries';
import { useProfile, useWeightTrend } from '@/hooks/data';
import { bmi, bmiCategory } from '@/lib/body';
import { formatShortDate, fromLocalDateString } from '@/lib/dates';
import { formatWeight, signedWeight, toDisplayWeight, weightUnitLabel, type UnitSystem } from '@/lib/units';
import { RANGE_DAYS, changeRows, projectGoal, rateNeededPerWeek, type WeightRange } from '@/lib/weight';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

const RANGES = (Object.keys(RANGE_DAYS) as WeightRange[]).map((r) => ({ value: r, label: r }));

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
        <WeightChart trend={trend} range={range} units={units} goalKg={profile?.goalWeightKg ?? null} />
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

function ChangeCards({ units }: { units: UnitSystem }) {
  const trend = useWeightTrend();
  const rows = changeRows(trend);
  return (
    <Card title="Change">
      <View style={styles.grid}>
        {rows.map((r) => (
          <View key={r.label} style={styles.cell}>
            <Text variant="label" muted>
              {r.partial && r.fromDay ? `${r.label} (since ${formatShortDate(fromLocalDateString(r.fromDay))})` : r.label}
            </Text>
            <Text variant="bodyStrong" style={styles.tabular}>
              {r.kg == null ? '–' : signedWeight(r.kg, units)}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="caption" muted>
        All changes use your trend line, which smooths out day-to-day water swings, so the numbers here, on the chart
        and under today’s weight always match. Where your history is shorter than the period, the change runs from your
        first weigh-in.
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
          {signedWeight(toGo, units).replace('down', 'to lose').replace('up', 'to gain')}
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
          Log your weight above to start your chart, or bring your history over from another app.
        </Text>
      ) : null}
      <Button variant="secondary" label="Import from screenshots" onPress={() => router.push('/import-weights')} />
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
