import { StyleSheet, View } from 'react-native';

import { StepsAccessCard } from '@/components/StepsAccessCard';
import { StepsChart } from '@/components/StepsChart';
import { Card, ProgressBar, Screen, Text } from '@/components/ui';
import { useProfile } from '@/hooks/data';
import { useStepsHistory, useStepsSync } from '@/hooks/steps';
import { fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { WEEK_DAYS, totalSteps } from '@/lib/steps';
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
  const todayKey = toLocalDateString();
  const week = useStepsHistory(WEEK_DAYS, todayKey);
  const today = week[week.length - 1]?.steps ?? null;
  const weekTotal = totalSteps(week);
  const hours = todayHours?.day === todayKey ? todayHours.hours : null;
  const reached = today != null && today >= target;

  return (
    <Screen title="Steps">
      <Card>
        <Text variant="label" muted>
          Today
        </Text>
        <Text variant="bigMetric">{today == null ? '–' : formatNumber(today)}</Text>
        <ProgressBar progress={today == null ? 0 : today / target} color={colors.steps} />
        <Text variant="label" muted>
          {reached
            ? `Target of ${formatNumber(target)} reached`
            : `${formatNumber(target - (today ?? 0))} to go of ${formatNumber(target)}`}
        </Text>
        {hours ? (
          <View style={styles.chart}>
            <StepsChart
              bars={hours.map((value, h) => ({ key: String(h), value }))}
              labels={['00:00', '06:00', '12:00', '18:00', '24:00']}
              height={110}
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
          accessibilityLabel={`Steps for the last 7 days. ${week
            .map((d) => `${weekday(d.day, todayKey)} ${d.steps == null ? 'no data' : formatNumber(d.steps)}`)
            .join(', ')}. Target ${formatNumber(target)}.`}
        />
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
  chart: { marginTop: space[3] },
  total: { gap: 2 },
});
