import { StyleSheet, View } from 'react-native';

import { StepsAccessCard } from '@/components/StepsAccessCard';
import { StepsChart } from '@/components/StepsChart';
import { Badge, Card, ProgressBar, Screen, Text } from '@/components/ui';
import { useProfile } from '@/hooks/data';
import { useStepsHistory, useStepsSync } from '@/hooks/steps';
import { useToday } from '@/hooks/useToday';
import { fromLocalDateString } from '@/lib/dates';
import { WEEK_DAYS, stepsSummary, totalSteps } from '@/lib/steps';
import { formatNumber } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const weekday = (day: string, today: string) =>
  day === today ? 'Today' : fromLocalDateString(day).toLocaleDateString(undefined, { weekday: 'short' });

export default function StepsScreen() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { todayHours } = useStepsSync();
  const target = profile?.stepTarget ?? 10000;
  const todayKey = useToday();
  const week = useStepsHistory(WEEK_DAYS, todayKey);
  const today = week[week.length - 1]?.steps ?? null;
  const weekTotal = totalSteps(week);
  const summary = stepsSummary(week, target);
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

      <Card title="Last 7 days">
        <View style={styles.total}>
          <Text variant="label" muted>
            7-day total
          </Text>
          <Text variant="metric">{weekTotal == null ? '–' : formatNumber(weekTotal)}</Text>
        </View>
        <StepsChart
          bars={week.map((d) => ({ key: d.day, value: d.steps }))}
          target={target}
          labels={week.map((d) => weekday(d.day, todayKey))}
          formatInspect={(b) => ({
            label:
              b.key === todayKey
                ? 'Today'
                : fromLocalDateString(b.key).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
            value: b.value == null ? 'No data' : `${formatNumber(b.value)} steps`,
          })}
          accessibilityLabel={`Steps for the last 7 days. ${week
            .map((d) => `${weekday(d.day, todayKey)} ${d.steps == null ? 'no data' : formatNumber(d.steps)}`)
            .join(', ')}. Target ${formatNumber(target)}.`}
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
