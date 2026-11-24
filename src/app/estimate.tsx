import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { VoiceButton } from '@/components/VoiceButton';
import { Button, Card, NumberField, Screen, Segmented, Text } from '@/components/ui';
import { addMeal } from '@/db/meals';
import { mealEstimateRequest, parseMealAnswer, totalOf, type EstimatedItem } from '@/lib/ai/mealEstimate';
import { prepareImage } from '@/lib/ai/prepareImage';
import { AI_PROVIDERS, AiError, requestJson } from '@/lib/ai/providers';
import { useAiSettings } from '@/lib/ai/settings';
import { toLocalDateString } from '@/lib/dates';
import { macroLine, scaleNutrition, type FoodUnit } from '@/lib/food';
import { MEAL_TYPES, formatNumber, isLocalDate, isMealType, type MealType } from '@/lib/today';
import { parseDecimal } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

type Row = {
  key: number;
  name: string;
  grams: string;
  unit: FoodUnit;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  confidence: EstimatedItem['confidence'] | null;
  /** The AI's numbers, so changing grams can rescale them. */
  base: EstimatedItem | null;
};

const str = (n: number | null | undefined) => (n == null ? '' : String(n));
const num = (t: string) => {
  const n = parseDecimal(t);
  return n != null && n >= 0 ? n : null;
};

let nextKey = 1;
const toRow = (i: EstimatedItem): Row => ({
  key: nextKey++,
  name: i.name,
  grams: str(i.grams),
  unit: i.unit,
  calories: str(i.calories),
  protein: str(i.proteinG),
  carbs: str(i.carbsG),
  fat: str(i.fatG),
  confidence: i.confidence,
  base: i,
});

/**
 * Photo and/or spoken description → AI estimate → check and edit each item → save.
 * Nothing is saved until the person taps Add.
 */
export default function EstimateScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ photo?: string; width?: string; meal?: string; day?: string }>();
  const photo = params.photo || null;
  const day = isLocalDate(params.day) ? params.day : toLocalDateString();
  const ai = useAiSettings();

  const [meal, setMeal] = useState<MealType>(isMealType(params.meal) ? params.meal : 'snack');
  const [description, setDescription] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const imageCache = useRef<Awaited<ReturnType<typeof prepareImage>> | null>(null);

  const canEstimate = !!photo || description.trim().length > 2;

  const estimate = async () => {
    if (!ai?.apiKey) return;
    setEstimating(true);
    setError(null);
    try {
      if (photo && !imageCache.current) {
        imageCache.current = await prepareImage(photo, params.width ? Number(params.width) : undefined);
      }
      const answer = await requestJson(
        ai.provider,
        ai.model,
        ai.apiKey,
        mealEstimateRequest({ image: imageCache.current, description }),
      );
      const parsed = parseMealAnswer(answer);
      if (!parsed) {
        setError(
          photo
            ? 'No food found in that photo. Try another photo, or describe what you ate.'
            : 'Couldn’t work out a meal from that. Try describing it in more detail.',
        );
        return;
      }
      setRows(parsed.items.map(toRow));
      setRaw(JSON.stringify(answer));
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setEstimating(false);
    }
  };

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null);

  const changeGrams = (r: Row, t: string) => {
    const g = parseDecimal(t);
    if (r.base && r.base.grams > 0 && g != null && g > 0) {
      const s = scaleNutrition(r.base, g / r.base.grams);
      update(r.key, { grams: t, calories: str(s.calories), protein: str(s.proteinG), carbs: str(s.carbsG), fat: str(s.fatG) });
    } else {
      update(r.key, { grams: t });
    }
  };

  const items = (rows ?? []).map((r) => ({
    name: r.name.trim(),
    grams: num(r.grams),
    unit: r.unit,
    calories: num(r.calories) ?? 0,
    proteinG: num(r.protein),
    carbsG: num(r.carbs),
    fatG: num(r.fat),
    confidence: r.confidence,
  }));
  const total = totalOf(items);
  const valid = items.length > 0 && items.every((i) => i.name && i.calories > 0 && i.calories < 10000);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await addMeal({
        day,
        mealType: meal,
        source: photo ? 'photo' : 'manual',
        items: items.map((i) => ({ ...i, calories: Math.round(i.calories), grams: i.grams == null ? null : Math.round(i.grams) })),
        voiceText: description.trim() || null,
        aiModel: ai ? `${ai.provider}:${ai.model}` : null,
        aiRawJson: raw,
      });
      // Close this screen and the add-food list under it.
      router.dismiss(2);
    } finally {
      setSaving(false);
    }
  };

  const keyMissing = ai !== null && !ai.apiKey;

  return (
    <Screen
      title={rows ? 'Check the estimate' : photo ? 'Your meal' : 'Describe your meal'}
      edges={['top', 'bottom']}
      footer={
        rows ? (
          <Button label={`Add ${formatNumber(total.calories)} calories`} onPress={save} disabled={!valid} loading={saving} />
        ) : keyMissing ? (
          <Button label="Add your Google AI key" onPress={() => router.push('/settings')} />
        ) : (
          <Button label="Estimate calories" onPress={estimate} disabled={!canEstimate || !ai} loading={estimating} />
        )
      }>
      {photo ? <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors /> : null}

      {rows ? (
        <>
          <Segmented value={meal} onChange={setMeal} options={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))} />
          <Card>
            <View style={styles.totalRow}>
              <View style={[styles.dot, { backgroundColor: colors.calories }]} />
              <Text variant="metric">{formatNumber(total.calories)}</Text>
              <Text variant="label" muted>
                calories
              </Text>
            </View>
            <Text variant="caption" muted>
              {macroLine(total)}
            </Text>
            <Text variant="caption" muted>
              An AI estimate. Check the amounts, especially anything marked low confidence. Changing an amount rescales
              that item.
            </Text>
          </Card>
          {rows.map((r) => (
            <Card key={r.key}>
              <View style={styles.itemHeader}>
                <TextInput
                  value={r.name}
                  onChangeText={(t) => update(r.key, { name: t })}
                  placeholder="Item name"
                  placeholderTextColor={colors.muted}
                  maxFontSizeMultiplier={MAX_FONT_SCALE}
                  accessibilityLabel="Item name"
                  style={[typeScale.bodyStrong, styles.itemName, { color: colors.text, borderBottomColor: colors.line }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${r.name || 'item'}`}
                  onPress={() => setRows((rs) => rs?.filter((x) => x.key !== r.key) ?? null)}
                  style={styles.icon}>
                  <Trash2 size={18} strokeWidth={1.8} color={colors.muted} />
                </Pressable>
              </View>
              {r.confidence === 'low' ? (
                <Text variant="caption" muted>
                  Low confidence: worth checking
                </Text>
              ) : null}
              <View style={styles.row}>
                <NumberField
                  label="Amount"
                  unit={r.unit}
                  onUnitPress={() => update(r.key, { unit: r.unit === 'g' ? 'ml' : 'g' })}
                  unitHint="Switches between grams and millilitres"
                  value={r.grams}
                  onChangeText={(t) => changeGrams(r, t)}
                />
                <NumberField label="Calories" value={r.calories} onChangeText={(t) => update(r.key, { calories: t })} />
              </View>
              <View style={styles.row}>
                <NumberField label="Protein" unit="g" value={r.protein} onChangeText={(t) => update(r.key, { protein: t })} />
                <NumberField label="Carbs" unit="g" value={r.carbs} onChangeText={(t) => update(r.key, { carbs: t })} />
                <NumberField label="Fat" unit="g" value={r.fat} onChangeText={(t) => update(r.key, { fat: t })} />
              </View>
            </Card>
          ))}
          <View style={styles.actions}>
            <Button
              variant="secondary"
              icon={Plus}
              accessibilityLabel="Add an item"
              onPress={() =>
                setRows((rs) => [
                  ...(rs ?? []),
                  { key: nextKey++, name: '', grams: '', unit: 'g', calories: '', protein: '', carbs: '', fat: '', confidence: null, base: null },
                ])
              }
            />
            <View style={styles.flex}>
              <Button variant="ghost" label="Change description and re-estimate" onPress={() => setRows(null)} />
            </View>
          </View>
        </>
      ) : (
        <>
          <Card>
            <Text variant="bodyMedium">{photo ? 'Anything the photo doesn’t show?' : 'What did you eat?'}</Text>
            <Text variant="label" muted>
              {photo
                ? 'Amounts, brands, how it was cooked, oil or butter, or if you only ate part of it. Optional, but it makes the estimate better.'
                : 'Say or type what and how much, e.g. “two eggs scrambled with butter, two slices of sourdough toast”.'}
            </Text>
            <VoiceButton onText={(t) => setDescription((d) => (d.trim() ? `${d.trim()} ${t}` : t))} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Or type here"
              placeholderTextColor={colors.muted}
              multiline
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              accessibilityLabel="Description"
              style={[
                typeScale.body,
                styles.description,
                { backgroundColor: colors.bg, borderColor: colors.line, color: colors.text },
              ]}
            />
          </Card>
          {estimating ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.text} />
              <Text variant="label" muted>
                Estimating… this takes a few seconds.
              </Text>
            </View>
          ) : null}
          {error ? (
            <Text variant="label" color={colors.danger}>
              {error}
            </Text>
          ) : null}
          {keyMissing ? (
            <Text variant="label" muted>
              Meal estimates use your own Google AI key. Add it in Settings → AI.
            </Text>
          ) : ai ? (
            <Text variant="caption" muted>
              {photo ? 'The photo and description are' : 'The description is'} sent to {AI_PROVIDERS[ai.provider].company}{' '}
              {AI_PROVIDERS[ai.provider].label} with your key to make the estimate. Voice is turned into text on your phone.
              The app doesn’t keep the photo.
            </Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: layout.cardRadius },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4, alignSelf: 'center' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  itemName: { flex: 1, minHeight: 40, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: layout.minTap, height: layout.minTap, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: space[2] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  description: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 96,
    textAlignVertical: 'top',
  },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
});
