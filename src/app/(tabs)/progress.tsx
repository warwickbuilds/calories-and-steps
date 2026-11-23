import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/LineChart';
import { PhotoThumb } from '@/components/PhotoThumb';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useCheckIns, useProfile, useWeightTrend } from '@/hooks/data';
import { bmi, bmiCategory, bodyComposition } from '@/lib/body';
import { formatShortDate } from '@/lib/dates';
import { formatWeight } from '@/lib/units';
import { space } from '@/theme/tokens';

export default function ProgressScreen() {
  const { profile } = useProfile();
  const checkIns = useCheckIns();
  const trend = useWeightTrend();
  const latest = checkIns[0];
  const previous = checkIns[1];
  const weightNow = trend[trend.length - 1]?.trend ?? null;
  const units = profile?.unitPref ?? 'metric';
  const withPhotos = checkIns.filter((c) => Object.keys(c.photos).length > 0);

  // Lean and fat mass use the check-in's own weight, or the current trend if none was entered.
  const comp = latest ? bodyComposition(latest.weightKg ?? weightNow ?? 0, latest.bodyFatPct) : null;
  const bmiValue = weightNow && profile ? bmi(weightNow, profile.heightCm) : null;

  const chartPoints = useMemo(
    () =>
      [...checkIns]
        .reverse()
        .map((c) => ({ t: new Date(c.measuredAt).getTime(), value: c.bodyFatPct })),
    [checkIns],
  );

  return (
    <Screen title="Progress">
      <Card>
        <Text variant="label" muted>
          Body fat (Navy method)
        </Text>
        {latest ? (
          <>
            <Text variant="bigMetric">{latest.bodyFatPct.toFixed(1)}%</Text>
            <Text variant="label" muted>
              {comp && (latest.weightKg ?? weightNow)
                ? `${formatWeight(comp.leanKg, units)} lean · ${formatWeight(comp.fatKg, units)} fat`
                : null}
              {previous
                ? `${comp ? ' · ' : ''}${Math.abs(latest.bodyFatPct - previous.bodyFatPct).toFixed(1)} points ${
                    latest.bodyFatPct <= previous.bodyFatPct ? 'down' : 'up'
                  } since ${formatShortDate(new Date(previous.measuredAt))}`
                : null}
            </Text>
            <Text variant="caption" muted>
              Last check-in {formatShortDate(new Date(latest.measuredAt), true)}
            </Text>
          </>
        ) : (
          <Text variant="label" muted>
            Measure your neck and waist{profile?.sex === 'female' ? ' and hips' : ''} to estimate body fat, and take
            photos to see your progress over time.
          </Text>
        )}
        <Button label="New check-in" onPress={() => router.push('/check-in')} />
      </Card>

      {checkIns.length > 0 ? (
        <Card
          title="Check-ins"
          right={
            withPhotos.length >= 2 ? (
              <Button variant="ghost" label="Compare" onPress={() => router.push('/compare')} />
            ) : undefined
          }>
          <FlatList
            horizontal
            data={checkIns}
            keyExtractor={(c) => String(c.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
            renderItem={({ item }) => (
              <Pressable
                style={styles.stripItem}
                accessibilityRole="button"
                accessibilityLabel={`Check-in ${formatShortDate(new Date(item.measuredAt), true)}, ${item.bodyFatPct.toFixed(1)} percent`}
                onPress={() => router.push({ pathname: '/check-ins/[id]', params: { id: String(item.id) } })}>
                <PhotoThumb path={item.photos.front?.thumbPath ?? item.photos.side?.thumbPath ?? item.photos.back?.thumbPath} />
                <Text variant="caption" muted>
                  {formatShortDate(new Date(item.measuredAt))}
                </Text>
                <Text variant="label">{item.bodyFatPct.toFixed(1)}%</Text>
              </Pressable>
            )}
          />
        </Card>
      ) : null}

      {checkIns.length > 1 ? (
        <Card title="Body fat over time">
          <LineChart
            points={chartPoints}
            height={150}
            formatValue={(v) => `${v.toFixed(1)}%`}
            formatDate={(t) => formatShortDate(new Date(t), true)}
            accessibilityLabel={`Body fat chart from ${chartPoints[0].value.toFixed(1)} to ${chartPoints[chartPoints.length - 1].value.toFixed(1)} percent`}
          />
        </Card>
      ) : null}

      {bmiValue ? (
        <Card title="BMI">
          <Text variant="metric">{bmiValue.toFixed(1)}</Text>
          <Text variant="label" muted>
            {bmiCategory(bmiValue)}. BMI doesn’t tell muscle from fat, so body fat is the better guide.
          </Text>
        </Card>
      ) : null}
      <View />
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: { gap: space[3] },
  stripItem: { width: 84, gap: 2 },
});
