import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, NumberField, Screen, Segmented, Text } from '@/components/ui';
import { findByBarcode, saveFoodRef, type FoodRef } from '@/db/foods';
import { addFood } from '@/db/meals';
import { nutritionLabelRequest, parseLabelAnswer } from '@/lib/ai/nutritionLabel';
import { prepareImage } from '@/lib/ai/prepareImage';
import { AiError, requestJson } from '@/lib/ai/providers';
import { useAiSettings } from '@/lib/ai/settings';
import { toLocalDateString } from '@/lib/dates';
import { macroLine, type FoodUnit } from '@/lib/food';
import type { FoodCategory } from '@/lib/foodCategory';
import { displayName, lookupBarcode, nutritionFor, type Per100g } from '@/lib/openFoodFacts';
import { MEAL_TYPES, formatNumber, isLocalDate, isMealType, type MealType } from '@/lib/today';
import { parseDecimal } from '@/lib/units';
import { installedVersion } from '@/lib/updates';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, radius, space, type as typeScale } from '@/theme/tokens';

type Step =
  | { kind: 'loading'; message: string }
  | { kind: 'not-found' }
  | { kind: 'offline' }
  | { kind: 'no-key' }
  | { kind: 'read-failed'; message: string }
  | { kind: 'form' };

type Origin = 'off' | 'panel' | 'custom';

const UNIT_HINT = 'Switches between grams and millilitres. Use ml for drinks when the label is per 100 ml.';

const str = (n: number | null | undefined) => (n == null ? '' : String(n));

/**
 * A packaged food: looked up by barcode (cache first, then Open Food Facts),
 * or read from a nutrition-label photo by AI. Every number can be corrected
 * before it is added, and corrections are saved for next time.
 */
export default function ProductScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ barcode?: string; photo?: string; width?: string; meal?: string; day?: string }>();
  const barcode = params.barcode || null;
  const day = isLocalDate(params.day) ? params.day : toLocalDateString();
  const ai = useAiSettings();

  const [step, setStep] = useState<Step>({
    kind: 'loading',
    message: params.photo ? 'Reading the label…' : barcode ? 'Looking it up…' : 'Loading…',
  });
  const [origin, setOrigin] = useState<Origin>('custom');
  const [refId, setRefId] = useState<number | null>(null);
  const [edited, setEdited] = useState(false);
  const [meal, setMeal] = useState<MealType>(isMealType(params.meal) ? params.meal : 'snack');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState<string | null>(null);
  const [cal, setCal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<FoodUnit>('g');
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const started = useRef(false);

  const fill = (f: Per100g | FoodRef, from: Origin, id: number | null) => {
    setName(f.name);
    setBrand(f.brand ?? null);
    setCal(str(f.caloriesPer100g));
    setProtein(str(f.proteinPer100g));
    setCarbs(str(f.carbsPer100g));
    setFat(str(f.fatPer100g));
    setServing(str(f.servingG));
    setUnit(f.unit === 'ml' ? 'ml' : 'g');
    setCategory(f.category ?? null);
    setAmount(str(f.servingG ?? 100));
    setOrigin(from);
    setRefId(id);
    setEdited(false);
    setStep({ kind: 'form' });
  };

  const readLabel = async (uri: string, width: number | undefined) => {
    try {
      const image = await prepareImage(uri, width);
      if (!ai?.apiKey) {
        setStep({ kind: 'no-key' });
        return;
      }
      const answer = await requestJson(ai.provider, ai.model, ai.apiKey, nutritionLabelRequest(image));
      const read = parseLabelAnswer(answer);
      if (!read) {
        setStep({ kind: 'read-failed', message: 'That didn’t look like a nutrition label. Try again with the table filling the frame.' });
        return;
      }
      const cached = barcode ? await findByBarcode(barcode) : null;
      fill(
        { ...read, name: read.name ?? cached?.name ?? '', brand: cached?.brand ?? null, category: read.category ?? cached?.category ?? null },
        'panel',
        null,
      );
      setEdited(true); // Not saved yet: saving on Add caches it under the barcode.
    } catch (e) {
      setStep({ kind: 'read-failed', message: e instanceof AiError ? e.message : 'Couldn’t read the label. Try again.' });
    }
  };

  const lookUp = async (code: string) => {
    const cached = await findByBarcode(code);
    if (cached) {
      fill(cached, cached.source, cached.id);
      return;
    }
    const result = await lookupBarcode(code, installedVersion() ?? '0');
    if (result.kind === 'found') {
      const id = await saveFoodRef(result.food, 'off', code);
      fill(result.food, 'off', id);
    } else {
      setStep({ kind: result.kind });
    }
  };

  useEffect(() => {
    // Label reading needs the saved key, which loads asynchronously.
    if (started.current || (params.photo && ai === null)) return;
    started.current = true;
    const photo = params.photo;
    const width = params.width ? Number(params.width) : undefined;
    // Started after the effect returns, so no state is set during it.
    void Promise.resolve().then(() =>
      photo ? readLabel(photo, width) : barcode ? lookUp(barcode) : setStep({ kind: 'form' }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai]);

  const per100 = useMemo(() => {
    const c = parseDecimal(cal);
    const opt = (t: string) => {
      const n = parseDecimal(t);
      return n != null && n >= 0 ? n : null;
    };
    if (c == null || c <= 0 || c > 950) return null;
    return { caloriesPer100g: c, proteinPer100g: opt(protein), carbsPer100g: opt(carbs), fatPer100g: opt(fat) };
  }, [cal, protein, carbs, fat]);
  const grams = parseDecimal(amount);
  const servingG = parseDecimal(serving);
  const total = per100 && grams && grams > 0 ? nutritionFor(per100, grams) : null;
  const valid = !!total && name.trim().length > 0 && grams! < 5000;

  const edit = (set: (t: string) => void) => (t: string) => {
    set(t);
    setEdited(true);
  };

  // Only the label changes: the numbers stay per 100 of whichever unit the pack uses.
  const toggleUnit = () => {
    setUnit((u) => (u === 'g' ? 'ml' : 'g'));
    setEdited(true);
  };

  const scanLabel = () =>
    router.replace({
      pathname: '/scan',
      params: { mode: 'label', meal, day, ...(barcode ? { barcode } : {}) },
    });

  const add = async () => {
    if (!valid || !per100 || !total || grams == null) return;
    setSaving(true);
    try {
      const food: Per100g = {
        name: name.trim(),
        brand,
        ...per100,
        servingG: servingG && servingG > 0 ? servingG : null,
        unit,
        category,
      };
      let id = refId;
      if (edited || id == null) {
        id = await saveFoodRef(food, edited && origin === 'off' ? 'custom' : origin, barcode);
      }
      await addFood({
        day,
        mealType: meal,
        source: origin === 'panel' ? 'panel' : barcode ? 'barcode' : 'manual',
        foodRefId: id,
        food: { name: displayName(food), ...total, grams: Math.round(grams), unit, category },
      });
      // Close this screen and the add-food list under it.
      router.dismiss(2);
    } finally {
      setSaving(false);
    }
  };

  if (step.kind !== 'form') {
    return (
      <Screen title={barcode ? 'Barcode' : 'Nutrition label'} edges={['top', 'bottom']}>
        <Card>
          {step.kind === 'loading' ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.text} />
              <Text variant="body">{step.message}</Text>
            </View>
          ) : null}
          {step.kind === 'not-found' ? (
            <>
              <Text variant="bodyStrong">Not in Open Food Facts yet</Text>
              <Text variant="label" muted>
                Barcode {barcode}. Photograph the nutrition label and AI will read it, or type the numbers in. Either way
                it’s saved on your phone for next time.
              </Text>
              <Button label="Photograph the label" onPress={scanLabel} />
              <Button variant="secondary" label="Enter it myself" onPress={() => setStep({ kind: 'form' })} />
            </>
          ) : null}
          {step.kind === 'offline' ? (
            <>
              <Text variant="bodyStrong">Couldn’t reach Open Food Facts</Text>
              <Text variant="label" muted>
                Check your connection and try again, or type the numbers from the label.
              </Text>
              <Button
                label="Try again"
                onPress={() => {
                  setStep({ kind: 'loading', message: 'Looking it up…' });
                  if (barcode) void lookUp(barcode);
                }}
              />
              <Button variant="secondary" label="Enter it myself" onPress={() => setStep({ kind: 'form' })} />
            </>
          ) : null}
          {step.kind === 'no-key' ? (
            <>
              <Text variant="bodyStrong">Reading labels needs your Google AI key</Text>
              <Text variant="label" muted>
                Add it in Settings → AI, or type the numbers from the label.
              </Text>
              <Button label="Open Settings" onPress={() => router.push('/settings')} />
              <Button variant="secondary" label="Enter it myself" onPress={() => setStep({ kind: 'form' })} />
            </>
          ) : null}
          {step.kind === 'read-failed' ? (
            <>
              <Text variant="bodyStrong">Couldn’t read the label</Text>
              <Text variant="label" muted>
                {step.message}
              </Text>
              <Button label="Take another photo" onPress={scanLabel} />
              <Button variant="secondary" label="Enter it myself" onPress={() => setStep({ kind: 'form' })} />
            </>
          ) : null}
        </Card>
      </Screen>
    );
  }

  const sourceNote =
    origin === 'off' && !edited
      ? 'From Open Food Facts. Fix anything that looks wrong; your changes are kept on this phone.'
      : origin === 'panel'
        ? 'Read from the label by AI. Check the numbers before adding.'
        : barcode
          ? 'Saved on this phone under this barcode.'
          : null;

  return (
    <Screen
      title={barcode ? 'Product' : 'Nutrition label'}
      edges={['top', 'bottom']}
      footer={<Button label="Add" onPress={add} disabled={!valid} loading={saving} />}>
      <Segmented value={meal} onChange={setMeal} options={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))} />

      <View style={styles.field}>
        <Text variant="label" muted>
          Name{brand ? ` (${brand})` : ''}
        </Text>
        <TextInput
          value={name}
          onChangeText={edit(setName)}
          placeholder="e.g. Muesli bar"
          placeholderTextColor={colors.muted}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel="Name"
          style={[typeScale.body, styles.text, { backgroundColor: colors.surface, borderColor: colors.line, color: colors.text }]}
        />
      </View>

      <Card title="How much">
        <View style={styles.chips}>
          {servingG && servingG > 0 ? (
            <Chip label={`1 serving (${formatNumber(servingG)} ${unit})`} selected={grams === servingG} onPress={() => setAmount(str(servingG))} />
          ) : null}
          {servingG && servingG > 0 ? (
            <Chip label="2 servings" selected={grams === servingG * 2} onPress={() => setAmount(str(servingG * 2))} />
          ) : null}
          <Chip label={`100 ${unit}`} selected={grams === 100} onPress={() => setAmount('100')} />
        </View>
        <NumberField
          label="Amount"
          unit={unit}
          onUnitPress={toggleUnit}
          unitHint={UNIT_HINT}
          value={amount}
          onChangeText={setAmount}
        />
        <Text variant="bodyStrong">
          {total ? `${formatNumber(total.calories)} calories` : '–'}
          {total && macroLine(total) ? (
            <Text variant="label" muted>
              {'  '}
              {macroLine(total)}
            </Text>
          ) : null}
        </Text>
      </Card>

      <Card title={`Per 100 ${unit}`}>
        <View style={styles.row}>
          <NumberField label="Calories" value={cal} onChangeText={edit(setCal)} />
          <NumberField
            label="Serving size"
            unit={unit}
            onUnitPress={toggleUnit}
            unitHint={UNIT_HINT}
            value={serving}
            onChangeText={edit(setServing)}
          />
        </View>
        <View style={styles.row}>
          <NumberField label="Protein" unit="g" value={protein} onChangeText={edit(setProtein)} />
          <NumberField label="Carbs" unit="g" value={carbs} onChangeText={edit(setCarbs)} />
          <NumberField label="Fat" unit="g" value={fat} onChangeText={edit(setFat)} />
        </View>
        {sourceNote ? (
          <Text variant="caption" muted>
            {sourceNote}
          </Text>
        ) : null}
        {origin !== 'panel' ? (
          <Button variant="ghost" label="Read the label with AI instead" onPress={scanLabel} />
        ) : null}
      </Card>
    </Screen>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.track }]}>
      <Text variant="bodyMedium" color={selected ? colors.onPrimary : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 44 },
  field: { gap: space[1] },
  text: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[4], minHeight: 52 },
  row: { flexDirection: 'row', gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { minHeight: 40, borderRadius: radius.pill, paddingHorizontal: space[4], justifyContent: 'center' },
});
