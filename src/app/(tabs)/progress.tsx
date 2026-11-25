import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { BmiBar } from '@/components/BmiBar';
import { LineChart } from '@/components/LineChart';
import { PhotoThumb } from '@/components/PhotoThumb';
import { Badge, Button, Card, Screen, SplitBar, Text } from '@/components/ui';
import { useCheckIns, useProfile, useWeightTrend, type CheckIn } from '@/hooks/data';
import { bmi, bmiCategory, bodyComposition } from '@/lib/body';
import { formatShortDate } from '@/lib/dates';
import { formatWeight } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function ProgressScreen() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const checkIns = useCheckIns();
  const trend = useWeightTrend();
  // Body fat comes from measured check-ins; photos-only ones still show in the strip.
  const measured = useMemo(
    () => checkIns.filter((c): c is CheckIn & { bodyFatPct: number } => c.bodyFatPct != null),
    [checkIns],
  );
  const latest = measured[0];
  const previous = measured[1];
  const weightNow = trend[trend.length - 1]?.trend ?? null;
  const units = profile?.unitPref ?? 'metric';
  const withPhotos = checkIns.filter((c) => Object.keys(c.photos).length > 0);

  // Lean and fat mass use the check-in's own weight, or the current trend if none was entered.
  const compWeight = latest ? (latest.weightKg ?? weightNow) : null;
  const comp = latest && compWeight ? bodyComposition(compWeight, latest.bodyFatPct) : null;
  const bmiValue = weightNow && profile ? bmi(weightNow, profile.heightCm) : null;
  const delta = latest && previous ? latest.bodyFatPct - previous.bodyFatPct : null;

  const chartPoints = useMemo(
    () =>
      [...measured]
        .reverse()
        .map((c) => ({ t: new Date(c.measuredAt).getTime(), value: c.bodyFatPct })),
    [measured],
  );

  return (
    <Screen title="Progress">
      <Card
        title="Body fat"
        right={
          delta != null ? (
            <Badge
              tone="body"
              dot
              label={`${Math.abs(delta).toFixed(1)} pts ${delta <= 0 ? 'down' : 'up'}`}
            />
          ) : (
            <Text variant="caption" muted>
              Navy method
            </Text>
          )
        }>
        {latest ? (
          <>
            <Text variant="bigMetric">{latest.bodyFatPct.toFixed(1)}%</Text>
            {comp ? (
              <View style={styles.comp}>
                <SplitBar
                  parts={[
                    { share: Math.max(0, 100 - latest.bodyFatPct) / 100, color: colors.weight },
                    { share: Math.max(0, latest.bodyFatPct) / 100, color: colors.body },
                  ]}
                />
                <View style={styles.compRow}>
                  <View style={styles.compItem}>
                    <View style={[styles.dot, { backgroundColor: colors.weight }]} />
                    <Text variant="label" muted>
                      Lean{' '}
                      <Text variant="bodyStrong" style={styles.tabular}>
                        {formatWeight(comp.leanKg, units)}
                      </Text>
                    </Text>
                  </View>
                  <View style={styles.compItem}>
                    <View style={[styles.dot, { backgroundColor: colors.body }]} />
                    <Text variant="label" muted>
                      Fat{' '}
                      <Text variant="bodyStrong" style={styles.tabular}>
                        {formatWeight(comp.fatKg, units)}
                      </Text>
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
            <Text variant="caption" muted>
              Measured {formatShortDate(new Date(latest.measuredAt), true)}
              {previous ? ` · compared with ${formatShortDate(new Date(previous.measuredAt))}` : ''}
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
                accessibilityLabel={`Check-in ${formatShortDate(new Date(item.measuredAt), true)}, ${
                  item.bodyFatPct != null ? `${item.bodyFatPct.toFixed(1)} percent` : 'photos only'
                }`}
                onPress={() => router.push({ pathname: '/check-ins/[id]', params: { id: String(item.id) } })}>
                <PhotoThumb path={item.photos.front?.thumbPath ?? item.photos.side?.thumbPath ?? item.photos.back?.thumbPath} />
                <Text variant="caption" muted>
                  {formatShortDate(new Date(item.measuredAt))}
                </Text>
                <Text variant="label" muted={item.bodyFatPct == null}>
                  {item.bodyFatPct != null ? `${item.bodyFatPct.toFixed(1)}%` : 'Photos'}
                </Text>
              </Pressable>
            )}
          />
        </Card>
      ) : null}

      {measured.length > 1 ? (
        <Card title="Body fat over time">
          <LineChart
            points={chartPoints}
            accentColor={colors.body}
            height={176}
            formatValue={(v) => `${v.toFixed(1)}%`}
            formatDate={(t) => formatShortDate(new Date(t), true)}
            accessibilityLabel={`Body fat chart from ${chartPoints[0].value.toFixed(1)} to ${chartPoints[chartPoints.length - 1].value.toFixed(1)} percent`}
          />
        </Card>
      ) : null}

      {bmiValue ? (
        <Card title="BMI" right={<Badge tone="body" label={bmiCategory(bmiValue)} />}>
          <Text variant="metric">{bmiValue.toFixed(1)}</Text>
          <BmiBar value={bmiValue} />
          <Text variant="label" muted>
            BMI doesn’t tell muscle from fat, so body fat is the better guide.
          </Text>
        </Card>
      ) : null}
      <View />
    </Screen>
  );
}

const styles = StyleSheet.create({
  comp: { gap: space[2] },
  compRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
  compItem: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tabular: { fontVariant: ['tabular-nums'] },
  strip: { gap: space[3] },
  stripItem: { width: 84, gap: 2 },
});
