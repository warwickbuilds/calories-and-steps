import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { PhotoThumb } from '@/components/PhotoThumb';
import { Button, Card, Screen, Segmented, Text } from '@/components/ui';
import { POSES, deleteCheckIn, type Pose } from '@/db/body';
import { useCheckIns, useProfile } from '@/hooks/data';
import { bmi, bodyComposition } from '@/lib/body';
import { formatWeight, lengthUnitLabel, toDisplayLength } from '@/lib/units';
import { space } from '@/theme/tokens';

export default function CheckInDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useProfile();
  const check = useCheckIns().find((c) => String(c.id) === id);
  const [pose, setPose] = useState<Pose>('front');

  if (!check || !profile) return <Screen edges={[]} />;
  const units = profile.unitPref;
  const len = (cm: number) => `${toDisplayLength(cm, units).toFixed(1)} ${lengthUnitLabel(units)}`;
  const comp = check.weightKg ? bodyComposition(check.weightKg, check.bodyFatPct) : null;
  const hasPhotos = Object.keys(check.photos).length > 0;

  const remove = () =>
    Alert.alert('Delete this check-in?', 'Its measurements and photos will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCheckIn(check.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen
      edges={[]}
      eyebrow={new Date(check.measuredAt).toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}
      title={`${check.bodyFatPct.toFixed(1)}% body fat`}>
      {hasPhotos ? (
        <Card>
          <Segmented value={pose} onChange={setPose} options={POSES} />
          <PhotoThumb
            path={check.photos[pose]?.path}
            accessibilityLabel={`${pose} photo`}
          />
        </Card>
      ) : null}
      <Card title="Measurements">
        <Row label="Neck" value={len(check.neckCm)} />
        <Row label="Waist" value={len(check.waistCm)} />
        {check.hipCm != null ? <Row label="Hips" value={len(check.hipCm)} /> : null}
        {check.weightKg != null ? <Row label="Weight" value={formatWeight(check.weightKg, units)} /> : null}
        {comp ? <Row label="Lean mass" value={formatWeight(comp.leanKg, units)} /> : null}
        {comp ? <Row label="Fat mass" value={formatWeight(comp.fatKg, units)} /> : null}
        {check.weightKg != null ? <Row label="BMI" value={bmi(check.weightKg, profile.heightCm).toFixed(1)} /> : null}
      </Card>
      <Button variant="ghost" label="Delete check-in" onPress={remove} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="body" muted>
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.tabular}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space[1] },
  tabular: { fontVariant: ['tabular-nums'] },
});
