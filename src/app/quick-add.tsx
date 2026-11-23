import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, NumberField, Screen, Segmented, Text } from '@/components/ui';
import { quickAdd } from '@/db/meals';
import { toLocalDateString } from '@/lib/dates';
import { MEAL_TYPES, type MealType } from '@/lib/today';
import { parseDecimal } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, radius, space, type as typeScale } from '@/theme/tokens';

const isMealType = (v: unknown): v is MealType => MEAL_TYPES.some((m) => m.value === v);

export default function QuickAddScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ meal?: string }>();
  const [meal, setMeal] = useState<MealType>(isMealType(params.meal) ? params.meal : 'snack');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);

  const cal = parseDecimal(calories);
  const valid = cal != null && cal > 0 && cal < 10000;
  const grams = (t: string) => {
    const n = parseDecimal(t);
    return n != null && n >= 0 ? n : null;
  };

  const save = async () => {
    if (!valid || cal == null) return;
    setSaving(true);
    try {
      await quickAdd({
        day: toLocalDateString(),
        mealType: meal,
        name: name.trim() || 'Quick add',
        calories: Math.round(cal),
        proteinG: grams(protein),
        carbsG: grams(carbs),
        fatG: grams(fat),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title="Quick add"
      edges={['top', 'bottom']}
      footer={<Button label="Add" onPress={save} disabled={!valid} loading={saving} />}>
      <Segmented
        value={meal}
        onChange={setMeal}
        options={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))}
      />
      <View style={styles.field}>
        <Text variant="label" muted>
          Name (optional)
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
      <NumberField label="Calories" unit="calories" value={calories} onChangeText={setCalories} autoFocus />
      <View style={styles.row}>
        <NumberField label="Protein" unit="g" value={protein} onChangeText={setProtein} />
        <NumberField label="Carbs" unit="g" value={carbs} onChangeText={setCarbs} />
        <NumberField label="Fat" unit="g" value={fat} onChangeText={setFat} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[1] },
  text: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[4], minHeight: 52 },
  row: { flexDirection: 'row', gap: space[2] },
});
