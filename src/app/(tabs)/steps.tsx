import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StepsAccessCard } from '@/components/StepsAccessCard';
import { StepsChart } from '@/components/StepsChart';
import { Badge, Card, ProgressBar, Screen, Segmented, Text } from '@/components/ui';
import { useProfile } from '@/hooks/data';
import { useStepsHistory, useStepsSync } from '@/hooks/steps';
import { useToday } from '@/hooks/useToday';
import {
  PERIOD_OPTIONS,
  PERIOD_SPEC,
  periodAxisLabels,
  periodBarLabel,
  periodBars,
  type ChartPeriod,
} from '@/lib/chartPeriods';
import { stepsSummary, totalSteps } from '@/lib/steps';
import { formatNumber } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function StepsScreen() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { todayHours } = useStepsSync();
  const target = profile?.stepTarget ?? 10000;
  const todayKey = useToday();
  const [period, setPeriod] = useState<ChartPeriod>('1W');
  const spec = PERIOD_SPEC[period];
  const history = useStepsHistory(spec.days, todayKey);
  const today = history[history.length - 1]?.steps ?? null;
  const periodTotal = totalSteps(history);
  const summary = stepsSummary(history, target);
  const bars = periodBars(
    history.map((d) => ({ day: d.day, value: d.steps })),
    period,
  );
  const daily = spec.bucket === 1;
  const hours = todayHours?.day === todayKey ? todayHours.hours : null;
  const reached = today != null && today >= target;

  return (
    <Screen title="Steps">
      <Card
        title="Today"
        right={
          <Badge
            tone="steps"
            dot
            label={reached ? 'Target reached' : `${formatNumber(target - (today ?? 0))} to go`}
          />
        }>
        <View style={styles.heroRow}>
          <Text variant="bigMetric">{today == null ? '–' : formatNumber(today)}</Text>
          <Text variant="label" muted>
            of {formatNumber(target)}
          </Text>
        </View>
        <ProgressBar progress={today == null ? 0 : today / target} color={colors.steps} />
        {hours ? (
          <View style={styles.chart}>
            <StepsChart
              bars={hours.map((value, h) => ({ key: String(h), value }))}
              labels={['00:00', '06:00', '12:00', '18:00', '24:00']}
              height={122}
              formatInspect={(b, h) => ({
                label: `${String(h).padStart(2, '0')}:00 – ${String((h + 1) % 24).padStart(2, '0')}:00`,
                value: b.value == null || b.value <= 0 ? 'No steps' : `${formatNumber(b.value)} steps`,
              })}
              accessibilityLabel={`Steps by hour today. Busiest hour ${busiestHour(hours)}.`}
            />
          </View>
        ) : null}
      </Card>

      <Card title={`Last ${spec.title}`}>
        <Segmented value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
        <View style={styles.total}>
          <Text variant="label" muted>
            {spec.short} total
          </Text>
          <Text variant="metric">{periodTotal == null ? '–' : formatNumber(periodTotal)}</Text>
        </View>
        <StepsChart
          bars={bars.map((b) => ({ key: b.key, value: b.value }))}
          target={target}
          average={period === '1W' ? null : summary.average}
          labels={periodAxisLabels(bars, period, todayKey)}
          formatInspect={(_, i) => {
            const b = bars[i];
            return {
              label: periodBarLabel(b, todayKey),
              value:
                b.value == null ? 'No data' : `${daily ? '' : 'avg '}${formatNumber(b.value)} steps`,
            };
          }}
          accessibilityLabel={`Steps for the last ${spec.title}${daily ? '' : period === '3M' ? ', as weekly averages' : ', as 4-week averages'}. Daily average ${
            summary.average == null ? 'no data' : formatNumber(summary.average)
          }. Target ${formatNumber(target)}.`}
        />
        {summary.daysWithData > 0 ? (
          <View style={[styles.stats, { borderTopColor: colors.line }]}>
            <View style={styles.stat}>
              <Text variant="caption" muted>
                Daily avg
              </Text>
              <Text variant="bodyStrong" style={styles.tabular}>
                {summary.average == null ? '–' : formatNumber(summary.average)}
              </Text>
            </View>
            <View style={[styles.stat, styles.statBorder, { borderLeftColor: colors.line }]}>
              <Text variant="caption" muted>
                On target
              </Text>
              <Text variant="bodyStrong" style={styles.tabular}>
                {summary.daysOnTarget} / {summary.daysWithData}
              </Text>
            </View>
            <View style={[styles.stat, styles.statBorder, { borderLeftColor: colors.line }]}>
              <Text variant="caption" muted>
                Streak
              </Text>
              <Text variant="bodyStrong" style={styles.tabular}>
                {summary.streak} {summary.streak === 1 ? 'day' : 'days'}
              </Text>
            </View>
          </View>
        ) : null}
      </Card>

      <StepsAccessCard />
    </Screen>
  );
}

function busiestHour(hours: number[]): string {
  const max = Math.max(...hours);
  if (max <= 0) return 'none yet';
  const h = hours.indexOf(max);
  return `${String(h).padStart(2, '0')}:00 with ${formatNumber(max)} steps`;
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  chart: { marginTop: space[3] },
  total: { gap: 2 },
  stats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space[3],
    marginTop: space[1],
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statBorder: { borderLeftWidth: StyleSheet.hairlineWidth },
  tabular: { fontVariant: ['tabular-nums'] },
});
