import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { LengthField } from '@/components/fields/LengthField';
import { WeightField } from '@/components/fields/WeightField';
import { PhotoThumb } from '@/components/PhotoThumb';
import { Button, Card, Screen, Text } from '@/components/ui';
import { POSES, saveCheckIn, type Pose } from '@/db/body';
import { useCheckIns, useLatestWeight, useProfile } from '@/hooks/data';
import { bmi, bodyComposition, navyBodyFat } from '@/lib/body';
import { captureStore, useCaptures } from '@/lib/captureStore';
import { formatWeight, lengthUnitLabel, toDisplayLength } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

/** New Navy method check-in: measurements, optional weight, and up to three photos. */
export default function CheckInScreen() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const latestWeight = useLatestWeight();
  const previous = useCheckIns()[0];
  const captures = useCaptures();
  const [neck, setNeck] = useState<number | null>(null);
  const [waist, setWaist] = useState<number | null>(null);
  const [hip, setHip] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(latestWeight?.weightKg ?? null);
  const [saving, setSaving] = useState(false);

  // Start with no leftover photos from an abandoned check-in.
  useEffect(() => {
    captureStore.clear();
    return () => captureStore.clear();
  }, []);

  if (!profile) return null;
  const units = profile.unitPref;
  const female = profile.sex === 'female';

  const pct =
    neck && waist && (!female || hip)
      ? navyBodyFat({ sex: profile.sex, heightCm: profile.heightCm, neckCm: neck, waistCm: waist, hipCm: hip })
      : null;
  const comp = pct != null && weight ? bodyComposition(weight, pct) : null;
  const ready = pct != null;

  const save = async () => {
    if (pct == null || !neck || !waist) return;
    setSaving(true);
    try {
      await saveCheckIn({
        measuredAt: new Date(),
        neckCm: neck,
        waistCm: waist,
        hipCm: female ? hip : null,
        bodyFatPct: pct,
        weightKg: weight,
        photos: captures,
      });
      captureStore.clear();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save the check-in', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const hint = (cm: number | undefined | null) =>
    cm ? `Last time ${toDisplayLength(cm, units).toFixed(1)} ${lengthUnitLabel(units)}` : null;

  return (
    <Screen
      title="New check-in"
      edges={['top', 'bottom']}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.close}>
          <X size={22} strokeWidth={1.8} color={colors.text} />
        </Pressable>
      }
      footer={<Button label="Save check-in" onPress={save} disabled={!ready} loading={saving} />}>
      <Card title="Measurements">
        <Text variant="label" muted>
          Measure at the narrowest part of the neck and around the waist at the navel{female ? ', and around the widest part of the hips' : ''}. Keep the tape level and snug, not tight.
        </Text>
        <LengthField label="Neck" units={units} valueCm={neck} onChangeCm={setNeck} minCm={20} maxCm={70} />
        {hint(previous?.neckCm) ? <Text variant="caption" muted>{hint(previous?.neckCm)}</Text> : null}
        <LengthField label="Waist" units={units} valueCm={waist} onChangeCm={setWaist} minCm={40} maxCm={200} />
        {hint(previous?.waistCm) ? <Text variant="caption" muted>{hint(previous?.waistCm)}</Text> : null}
        {female ? (
          <LengthField label="Hips" units={units} valueCm={hip} onChangeCm={setHip} minCm={50} maxCm={200} />
        ) : null}
        <WeightField label="Weight" units={units} valueKg={weight} onChangeKg={setWeight} />
      </Card>

      <Card title="Photos (optional)">
        <Text variant="label" muted>
          Same spot, same light and similar clothes each time makes them easy to compare.
        </Text>
        <View style={styles.photos}>
          {POSES.map((p) => (
            <Pressable
              key={p.value}
              style={styles.photo}
              accessibilityRole="button"
              accessibilityLabel={captures[p.value] ? `Retake ${p.label.toLowerCase()} photo` : `Take ${p.label.toLowerCase()} photo`}
              onPress={() => router.push({ pathname: '/camera', params: { pose: p.value } })}
              onLongPress={() => captures[p.value] && captureStore.remove(p.value as Pose)}>
              <PhotoThumb uri={captures[p.value]} />
              <Text variant="caption" muted style={styles.center}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="label" muted>
          Body fat (Navy method)
        </Text>
        <Text variant="bigMetric">{pct == null ? '–' : `${pct.toFixed(1)}%`}</Text>
        {comp ? (
          <Text variant="label" muted>
            {formatWeight(comp.leanKg, units)} lean · {formatWeight(comp.fatKg, units)} fat
            {weight ? ` · BMI ${bmi(weight, profile.heightCm).toFixed(1)}` : ''}
          </Text>
        ) : (
          <Text variant="label" muted>
            Enter your measurements to see it.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { width: layout.minTap, height: layout.minTap, alignItems: 'center', justifyContent: 'center' },
  photos: { flexDirection: 'row', gap: space[2] },
  photo: { flex: 1, gap: space[1], borderRadius: radius.md },
  center: { textAlign: 'center' },
});
