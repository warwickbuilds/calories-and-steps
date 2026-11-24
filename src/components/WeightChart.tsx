import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/LineChart';
import { Text } from '@/components/ui';
import { formatShortDate, fromLocalDateString } from '@/lib/dates';
import { signedWeight, toDisplayWeight, weightUnitLabel, type UnitSystem } from '@/lib/units';
import {
  RANGE_DAYS,
  inRange,
  milestones,
  periodChange,
  projectionLine,
  type Milestone,
  type TrendPoint,
  type WeightRange,
} from '@/lib/weight';
import { milestoneColor } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * The Weight tab's chart block: the change over the chosen period as a big
 * number, the chart (weigh-ins, faint trend and projection, goal, milestone
 * dots) and the milestone chips. Takes the trend as a prop so it can be
 * previewed without a database.
 */
/** Round milestone steps: 5 kg, or 10 lb in imperial. */
const milestoneStepKg = (units: UnitSystem) => (units === 'imperial' ? 4.5359237 : 5);

function sinceText(day: string) {
  return formatShortDate(fromLocalDateString(day), true);
}

export function WeightChart({
  trend,
  range,
  units,
  goalKg,
  today = new Date(),
}: {
  trend: TrendPoint[];
  range: WeightRange;
  units: UnitSystem;
  goalKg: number | null;
  today?: Date;
}) {
  const { colors } = useTheme();
  const unit = weightUnitLabel(units);
  const shown = useMemo(() => inRange(trend, range, today), [trend, range, today]);
  const points = useMemo(
    () =>
      shown.map((p) => ({
        t: fromLocalDateString(p.day).getTime(),
        value: toDisplayWeight(p.kg, units),
        trend: toDisplayWeight(p.trend, units),
      })),
    [shown, units],
  );
  const change = periodChange(trend, RANGE_DAYS[range], today);
  const goal = goalKg == null ? null : toDisplayWeight(goalKg, units);

  // Carry the trend on to the goal. In short periods stop after the same
  // length again, so the readings keep at least half the chart.
  const spanDays =
    RANGE_DAYS[range] ??
    (trend.length > 1
      ? Math.max(1, Math.round((fromLocalDateString(trend[trend.length - 1].day).getTime() - fromLocalDateString(trend[0].day).getTime()) / 864e5))
      : 1);
  const line = projectionLine(trend, goalKg, range === 'All' || range === '1Y' || range === '6M' ? null : spanDays, today);
  const projection = line
    ? {
        from: { t: fromLocalDateString(line.from.day).getTime(), value: toDisplayWeight(line.from.kg, units) },
        to: { t: fromLocalDateString(line.to.day).getTime(), value: toDisplayWeight(line.to.kg, units) },
        cut: line.cut,
      }
    : null;

  const firstShown = shown[0]?.day;
  const marks = milestones(trend, milestoneStepKg(units));
  const markers = marks
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.reachedDay != null && firstShown != null && m.reachedDay >= firstShown)
    .map(({ m, i }) => ({
      t: fromLocalDateString(m.reachedDay!).getTime(),
      value: toDisplayWeight(m.reachedTrendKg ?? m.weightKg, units),
      color: milestoneColor(colors, i),
      label: `${lostDir(trend) ? '−' : '+'}${Math.round(toDisplayWeight(m.amountKg, units))}`,
    }));

  // A faint line in the next milestone's colour, so you can see how close it is.
  const nextIndex = marks.findIndex((m) => m.reachedDay == null);
  const guides =
    nextIndex >= 0
      ? [{ value: toDisplayWeight(marks[nextIndex].weightKg, units), color: milestoneColor(colors, nextIndex) }]
      : [];

  const last = points[points.length - 1];
  return (
    <View style={styles.chartBlock}>
      {change.kg != null ? (
        <View accessible accessibilityLabel={`${PERIOD_WORDS[range]}: ${signedWeight(change.kg, units)}`}>
          <Text variant="bigMetric">{signedWeight(change.kg, units)}</Text>
          <Text variant="label" muted>
            {change.partial || range === 'All'
              ? `Since you started, ${sinceText(change.fromDay!)}`
              : PERIOD_WORDS[range]}
            {` · trend ${toDisplayWeight(change.fromKg!, units).toFixed(1)} → ${toDisplayWeight(change.toKg!, units).toFixed(1)} ${unit}`}
          </Text>
        </View>
      ) : null}
      <LineChart
        points={points}
        goal={goal}
        projection={projection}
        markers={markers}
        guides={guides}
        height={200}
        formatValue={(v) => `${Number.isInteger(v) ? v : v.toFixed(1)}`}
        formatDate={(t) => formatShortDate(new Date(t), range === '1Y' || range === 'All' || t > today.getTime())}
        accessibilityLabel={
          last
            ? `Weight chart, ${range}. Latest weigh-in ${last.value.toFixed(1)} ${unit}, trend ${last.trend?.toFixed(1)} ${unit}.`
            : `Weight chart, ${range}. No entries.`
        }
      />
      {marks.length > 0 ? <Milestones marks={marks} trend={trend} units={units} /> : null}
    </View>
  );
}

/** True when the trend has gone down from the start (milestones count weight lost). */
const lostDir = (trend: TrendPoint[]) => trend.length < 2 || trend[trend.length - 1].trend <= trend[0].trend;

const PERIOD_WORDS: Record<WeightRange, string> = {
  '1W': 'Past week',
  '1M': 'Past month',
  '6M': 'Past 6 months',
  '1Y': 'Past year',
  All: 'All time',
};

function Milestones({ marks, trend, units }: { marks: Milestone[]; trend: TrendPoint[]; units: UnitSystem }) {
  const { colors } = useTheme();
  const latest = trend[trend.length - 1];
  const unit = weightUnitLabel(units);
  const lost = lostDir(trend);
  return (
    <View style={styles.milestones}>
      {marks.map((m, i) => {
        const amount = `${Math.round(toDisplayWeight(m.amountKg, units))} ${unit} ${lost ? 'lost' : 'gained'}`;
        const color = milestoneColor(colors, i);
        const toGo = latest ? Math.abs(latest.trend - m.weightKg) : 0;
        return (
          <View
            key={m.amountKg}
            style={[styles.chip, { borderColor: m.reachedDay ? color : colors.line }]}
            accessible
            accessibilityLabel={
              m.reachedDay
                ? `${amount} on ${sinceText(m.reachedDay)}`
                : `Next milestone ${amount}, ${toDisplayWeight(toGo, units).toFixed(1)} ${unit} to go`
            }>
            <View
              style={[
                styles.chipDot,
                m.reachedDay ? { backgroundColor: color } : { borderColor: color, borderWidth: 1.5 },
              ]}
            />
            <Text variant="caption">{amount}</Text>
            <Text variant="caption" muted>
              {m.reachedDay
                ? formatShortDate(fromLocalDateString(m.reachedDay))
                : `${toDisplayWeight(toGo, units).toFixed(1)} to go`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chartBlock: { gap: space[3] },
  milestones: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1] + 2,
    paddingHorizontal: space[2] + 2,
    paddingVertical: space[1] + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
});
