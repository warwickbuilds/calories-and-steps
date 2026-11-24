import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PhotoThumb } from '@/components/PhotoThumb';
import { Card, Screen, Segmented, Text } from '@/components/ui';
import { POSES, type Pose } from '@/db/body';
import { useCheckIns, useProfile, type CheckIn } from '@/hooks/data';
import { formatShortDate } from '@/lib/dates';
import { formatWeight } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Side-by-side photos from any two check-ins. Defaults to the first and the latest. */
export default function CompareScreen() {
  const { profile } = useProfile();
  const all = useCheckIns();
  const withPhotos = all.filter((c) => Object.keys(c.photos).length > 0);
  const [pose, setPose] = useState<Pose>('front');
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const [afterId, setAfterId] = useState<number | null>(null);

  if (withPhotos.length < 2 || !profile) {
    return (
      <Screen edges={[]}>
        <Text variant="body" muted>
          Compare needs at least two check-ins with photos.
        </Text>
      </Screen>
    );
  }
  const before = withPhotos.find((c) => c.id === beforeId) ?? withPhotos[withPhotos.length - 1];
  const after = withPhotos.find((c) => c.id === afterId) ?? withPhotos[0];
  const units = profile.unitPref;

  const summary = (c: CheckIn) =>
    [c.bodyFatPct != null ? `${c.bodyFatPct.toFixed(1)}%` : null, c.weightKg != null ? formatWeight(c.weightKg, units) : null]
      .filter(Boolean)
      .join(' · ');

  return (
    <Screen edges={[]}>
      <Segmented value={pose} onChange={setPose} options={POSES} />
      <View style={styles.pair}>
        {[before, after].map((c, i) => (
          <View key={i} style={styles.side}>
            <PhotoThumb
              path={c.photos[pose]?.path}
              accessibilityLabel={`${i === 0 ? 'Before' : 'After'}, ${formatShortDate(new Date(c.measuredAt), true)}`}
            />
            <Text variant="bodyStrong">{formatShortDate(new Date(c.measuredAt), true)}</Text>
            <Text variant="caption" muted>
              {summary(c)}
            </Text>
          </View>
        ))}
      </View>
      <Card title="Before">
        <DatePicker items={withPhotos} selected={before.id} onSelect={setBeforeId} />
      </Card>
      <Card title="After">
        <DatePicker items={withPhotos} selected={after.id} onSelect={setAfterId} />
      </Card>
    </Screen>
  );
}

function DatePicker({
  items,
  selected,
  onSelect,
}: {
  items: CheckIn[];
  selected: number;
  onSelect: (id: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((c) => {
        const on = c.id === selected;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onSelect(c.id)}
            style={[styles.chip, { backgroundColor: on ? colors.text : colors.track }]}>
            <Text variant="label" color={on ? colors.surface : colors.text}>
              {formatShortDate(new Date(c.measuredAt), true)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: space[3] },
  side: { flex: 1, gap: space[1] },
  chips: { gap: space[2] },
  chip: { minHeight: 36, paddingHorizontal: space[3], borderRadius: radius.pill, justifyContent: 'center' },
});
