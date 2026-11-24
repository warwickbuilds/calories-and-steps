import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/fields/DateField';
import { LengthField } from '@/components/fields/LengthField';
import { WeightField } from '@/components/fields/WeightField';
import { PhotoThumb } from '@/components/PhotoThumb';
import { Button, Card, Screen, Text } from '@/components/ui';
import { POSES, saveCheckIn, updateCheckIn, type Pose } from '@/db/body';
import { allWeightsQuery } from '@/db/queries';
import type { Profile } from '@/db/schema';
import { useCheckIns, useLatestWeight, useProfile, type CheckIn } from '@/hooks/data';
import { bmi, bodyComposition, checkInReadiness, checkInTimestamp, navyBodyFat } from '@/lib/body';
import { captureStore, useCaptures } from '@/lib/captureStore';
import { fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { formatWeight, lengthUnitLabel, toDisplayLength } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

/**
 * New or edited check-in (`?id=` edits): the day, Navy method measurements,
 * optional weight, and up to three photos. Measurements or photos can be left
 * out, but not both.
 */
export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile } = useProfile();
  const checkIns = useCheckIns();
  const editing = id ? checkIns.find((c) => String(c.id) === id) : undefined;

  // Start with no leftover photos from an abandoned check-in.
  useEffect(() => {
    captureStore.clear();
    return () => captureStore.clear();
  }, []);

  // Wait for the check-in being edited, so the fields start with its values.
  if (!profile || (id && !editing)) return null;
  return <CheckInForm profile={profile} editing={editing} previous={checkIns.find((c) => c.id !== editing?.id && c.neckCm != null)} />;
}

function CheckInForm({ profile, editing, previous }: { profile: Profile; editing?: CheckIn; previous?: CheckIn }) {
  const { colors } = useTheme();
  const latestWeight = useLatestWeight();
  const { data: weights } = useLiveQuery(allWeightsQuery());
  const captures = useCaptures();
  const today = toLocalDateString();
  const [day, setDay] = useState(editing ? toLocalDateString(new Date(editing.measuredAt)) : today);
  const [neck, setNeck] = useState<number | null>(editing?.neckCm ?? null);
  const [waist, setWaist] = useState<number | null>(editing?.waistCm ?? null);
  const [hip, setHip] = useState<number | null>(editing?.hipCm ?? null);
  const [weight, setWeight] = useState<number | null>(editing ? editing.weightKg : (latestWeight?.weightKg ?? null));
  const [weightTouched, setWeightTouched] = useState(!!editing);
  const [weightKey, setWeightKey] = useState(0);
  const [removed, setRemoved] = useState<Set<Pose>>(new Set());
  const [saving, setSaving] = useState(false);

  const units = profile.unitPref;
  const female = profile.sex === 'female';

  // A new check-in fills in the weigh-in from the chosen day until the weight is typed over.
  const weighInOn = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const w of weights ?? []) {
      const d = toLocalDateString(new Date(w.measuredAt));
      if (!byDay.has(d)) byDay.set(d, w.weightKg);
    }
    return (d: string) => byDay.get(d) ?? null;
  }, [weights]);

  const changeDay = (d: string | null) => {
    if (!d) return;
    setDay(d);
    if (!weightTouched) {
      setWeight(d === today ? (latestWeight?.weightKg ?? null) : weighInOn(d));
      setWeightKey((k) => k + 1);
    }
  };

  const photoFor = (pose: Pose): { uri?: string; path?: string | null } | null => {
    if (captures[pose]) return { uri: captures[pose] };
    const stored = editing?.photos[pose];
    if (stored && !removed.has(pose)) return { path: stored.thumbPath ?? stored.path };
    return null;
  };
  const photoCount = POSES.filter((p) => photoFor(p.value)).length;

  const pct =
    neck && waist && (!female || hip)
      ? navyBodyFat({ sex: profile.sex, heightCm: profile.heightCm, neckCm: neck, waistCm: waist, hipCm: hip })
      : null;
  const comp = pct != null && weight ? bodyComposition(weight, pct) : null;
  const ready = checkInReadiness({ female, neckCm: neck, waistCm: waist, hipCm: female ? hip : null, bodyFatPct: pct, photoCount });

  const save = async () => {
    if (!ready.ok) return;
    setSaving(true);
    const measured = ready.measured;
    const input = {
      measuredAt: checkInTimestamp(fromLocalDateString(day), {
        keepTimeOf: editing ? new Date(editing.measuredAt) : undefined,
      }),
      neckCm: measured ? neck : null,
      waistCm: measured ? waist : null,
      hipCm: measured && female ? hip : null,
      bodyFatPct: measured ? pct : null,
      weightKg: weight,
      photos: captures,
      removePoses: [...removed],
    };
    try {
      if (editing) await updateCheckIn(editing.id, input);
      else await saveCheckIn(input);
      captureStore.clear();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save the check-in', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const keep = (pose: Pose) =>
    setRemoved((r) => {
      const next = new Set(r);
      next.delete(pose);
      return next;
    });

  const pickFromLibrary = async (pose: Pose) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const uri = res.canceled ? null : res.assets[0]?.uri;
    if (uri) {
      captureStore.set(pose, uri);
      keep(pose);
    }
  };

  const removePhoto = (pose: Pose) => {
    captureStore.remove(pose);
    if (editing?.photos[pose]) setRemoved((r) => new Set(r).add(pose));
  };

  const photoOptions = (pose: Pose, label: string) => {
    const has = !!photoFor(pose);
    const camera = () => {
      keep(pose);
      router.push({ pathname: '/camera', params: { pose } });
    };
    // Android shows at most three buttons; tapping outside cancels.
    Alert.alert(
      `${label} photo`,
      undefined,
      [
        has ? { text: 'Remove', style: 'destructive', onPress: () => removePhoto(pose) } : { text: 'Cancel', style: 'cancel' },
        { text: 'From photos', onPress: () => pickFromLibrary(pose) },
        { text: has ? 'Retake' : 'Camera', onPress: camera },
      ],
      { cancelable: true },
    );
  };

  const hint = (cm: number | undefined | null) =>
    cm ? `Last time ${toDisplayLength(cm, units).toFixed(1)} ${lengthUnitLabel(units)}` : null;

  return (
    <Screen
      title={editing ? 'Edit check-in' : 'New check-in'}
      edges={['top', 'bottom']}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.close}>
          <X size={22} strokeWidth={1.8} color={colors.text} />
        </Pressable>
      }
      footer={
        <View style={styles.footer}>
          {!ready.ok ? (
            <Text variant="caption" muted style={styles.center}>
              {ready.reason}
            </Text>
          ) : null}
          <Button
            label={editing ? 'Save changes' : ready.ok && !ready.measured ? 'Save photos' : 'Save check-in'}
            onPress={save}
            disabled={!ready.ok}
            loading={saving}
          />
        </View>
      }>
      <Card>
        <DateField label="Date" value={day} onChange={changeDay} past />
      </Card>

      <Card title="Measurements">
        <Text variant="label" muted>
          Measure at the narrowest part of the neck and around the waist at the navel{female ? ', and around the widest part of the hips' : ''}. Keep the tape level and snug, not tight. Leave them empty to save photos only.
        </Text>
        <LengthField label="Neck" units={units} valueCm={neck} onChangeCm={setNeck} minCm={20} maxCm={70} />
        {hint(previous?.neckCm) ? <Text variant="caption" muted>{hint(previous?.neckCm)}</Text> : null}
        <LengthField label="Waist" units={units} valueCm={waist} onChangeCm={setWaist} minCm={40} maxCm={200} />
        {hint(previous?.waistCm) ? <Text variant="caption" muted>{hint(previous?.waistCm)}</Text> : null}
        {female ? (
          <LengthField label="Hips" units={units} valueCm={hip} onChangeCm={setHip} minCm={50} maxCm={200} />
        ) : null}
        <WeightField
          key={weightKey}
          label="Weight"
          units={units}
          valueKg={weight}
          onChangeKg={(kg) => {
            setWeight(kg);
            setWeightTouched(true);
          }}
        />
      </Card>

      <Card title="Photos (optional)">
        <Text variant="label" muted>
          Same spot, same light and similar clothes each time makes them easy to compare. Older photos can come from your gallery.
        </Text>
        <View style={styles.photos}>
          {POSES.map((p) => {
            const photo = photoFor(p.value);
            return (
              <Pressable
                key={p.value}
                style={styles.photo}
                accessibilityRole="button"
                accessibilityLabel={photo ? `Change ${p.label.toLowerCase()} photo` : `Add ${p.label.toLowerCase()} photo`}
                onPress={() => photoOptions(p.value, p.label)}>
                <PhotoThumb uri={photo?.uri} path={photo?.path} />
                <Text variant="caption" muted style={styles.center}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
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
  footer: { gap: space[2] },
  photos: { flexDirection: 'row', gap: space[2] },
  photo: { flex: 1, gap: space[1], borderRadius: radius.md },
  center: { textAlign: 'center' },
});
