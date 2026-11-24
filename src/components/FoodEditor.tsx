import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, NumberField, Screen, Segmented, Text } from '@/components/ui';
import type { FoodValues } from '@/db/meals';
import { scaleNutrition, type Nutrition } from '@/lib/food';
import { MEAL_TYPES, type MealType } from '@/lib/today';
import { parseDecimal } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, radius, space, type as typeScale } from '@/theme/tokens';

const PORTIONS = [
  { factor: 0.5, label: '½' },
  { factor: 1, label: '1' },
  { factor: 1.5, label: '1½' },
  { factor: 2, label: '2' },
];

const str = (n: number | null | undefined) => (n == null ? '' : String(n));

export type FoodEditorInitial = { name: string } & Partial<Nutrition>;

/**
 * The one form for a food: quick add, adding a recent food, and editing a
 * logged item. When `base` is given (a known serving), portion buttons and
 * the grams field rescale every number from it.
 */
export function FoodEditor({
  title,
  initial,
  base,
  initialMeal,
  saveLabel,
  onSave,
  footerExtra,
  autoFocusCalories,
}: {
  title: string;
  initial?: FoodEditorInitial;
  base?: Nutrition | null;
  initialMeal: MealType;
  saveLabel: string;
  onSave: (food: FoodValues, meal: MealType) => Promise<void>;
  footerExtra?: React.ReactNode;
  autoFocusCalories?: boolean;
}) {
  const { colors } = useTheme();
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [name, setName] = useState(initial?.name ?? '');
  const [calories, setCalories] = useState(str(initial?.calories));
  const [protein, setProtein] = useState(str(initial?.proteinG));
  const [carbs, setCarbs] = useState(str(initial?.carbsG));
  const [fat, setFat] = useState(str(initial?.fatG));
  const [grams, setGrams] = useState(str(initial?.grams));
  const [portion, setPortion] = useState<number | null>(base ? 1 : null);
  const [saving, setSaving] = useState(false);

  const cal = parseDecimal(calories);
  const valid = cal != null && cal > 0 && cal < 10000;
  const num = (t: string) => {
    const n = parseDecimal(t);
    return n != null && n >= 0 ? n : null;
  };

  const apply = (n: Nutrition, keepGrams = false) => {
    setCalories(str(n.calories));
    setProtein(str(n.proteinG));
    setCarbs(str(n.carbsG));
    setFat(str(n.fatG));
    if (!keepGrams) setGrams(str(n.grams));
  };

  const pickPortion = (factor: number) => {
    if (!base) return;
    setPortion(factor);
    apply(scaleNutrition(base, factor));
  };

  const changeGrams = (t: string) => {
    setGrams(t);
    const g = parseDecimal(t);
    if (base?.grams && g != null && g > 0) {
      setPortion(null);
      apply(scaleNutrition(base, g / base.grams), true);
    }
  };

  const save = async () => {
    if (!valid || cal == null) return;
    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim() || 'Quick add',
          calories: Math.round(cal),
          proteinG: num(protein),
          carbsG: num(carbs),
          fatG: num(fat),
          grams: num(grams),
        },
        meal,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title={title}
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footer}>
          <Button label={saveLabel} onPress={save} disabled={!valid} loading={saving} />
          {footerExtra}
        </View>
      }>
      <Segmented value={meal} onChange={setMeal} options={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))} />
      <View style={styles.field}>
        <Text variant="label" muted>
          Name
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Coffee with milk"
          placeholderTextColor={colors.muted}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel="Name"
          style={[
            typeScale.body,
            styles.text,
            { backgroundColor: colors.surface, borderColor: colors.line, color: colors.text },
          ]}
        />
      </View>
      {base ? (
        <View style={styles.field}>
          <Text variant="label" muted>
            Servings
          </Text>
          <View style={styles.portions} accessibilityRole="radiogroup">
            {PORTIONS.map((p) => {
              const selected = portion === p.factor;
              return (
                <Pressable
                  key={p.factor}
                  accessibilityRole="radio"
                  accessibilityLabel={`${p.factor} servings`}
                  accessibilityState={{ selected }}
                  onPress={() => pickPortion(p.factor)}
                  style={[
                    styles.portion,
                    { backgroundColor: selected ? colors.primary : colors.track },
                  ]}>
                  <Text variant="bodyStrong" color={selected ? colors.onPrimary : colors.text}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={styles.row}>
        <NumberField
          label="Calories"
          unit="calories"
          value={calories}
          onChangeText={(t) => {
            setCalories(t);
            setPortion(null);
          }}
          autoFocus={autoFocusCalories}
        />
        <NumberField label="Amount (optional)" unit="g" value={grams} onChangeText={changeGrams} />
      </View>
      <View style={styles.row}>
        <NumberField label="Protein" unit="g" value={protein} onChangeText={setProtein} />
        <NumberField label="Carbs" unit="g" value={carbs} onChangeText={setCarbs} />
        <NumberField label="Fat" unit="g" value={fat} onChangeText={setFat} />
      </View>
      {base?.grams ? (
        <Text variant="caption" muted>
          Changing the amount in grams rescales calories and macros.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[1] },
  text: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[4], minHeight: 52 },
  row: { flexDirection: 'row', gap: space[2] },
  portions: { flexDirection: 'row', gap: space[2] },
  portion: { flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  footer: { gap: space[2] },
});
