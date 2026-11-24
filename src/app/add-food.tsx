import { router, useLocalSearchParams } from 'expo-router';
import { Check, Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AddButton, Button, Card, Screen, Segmented, Text } from '@/components/ui';
import { addFood } from '@/db/meals';
import { useRecentFoods } from '@/hooks/data';
import { toLocalDateString } from '@/lib/dates';
import { dayLabel, macroLine, searchFoods, type RecentFood } from '@/lib/food';
import { MEAL_TYPES, formatNumber, isLocalDate, isMealType, type MealType } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

/** Where every "+" leads: search foods logged before, or quick add. */
export default function AddFoodScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ meal?: string; day?: string }>();
  const day = isLocalDate(params.day) ? params.day : toLocalDateString();
  const [meal, setMeal] = useState<MealType>(isMealType(params.meal) ? params.meal : 'snack');
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const recent = useRecentFoods();
  const matches = useMemo(() => searchFoods(recent, query), [recent, query]);
  const isToday = day === toLocalDateString();

  const quickAdd = (name?: string) =>
    router.push({ pathname: '/quick-add', params: { meal, day, from: 'add', ...(name ? { name } : {}) } });

  const open = (f: RecentFood) =>
    router.push({
      pathname: '/food-item',
      params: {
        meal,
        day,
        food: JSON.stringify({
          name: f.name,
          calories: f.calories,
          proteinG: f.proteinG,
          carbsG: f.carbsG,
          fatG: f.fatG,
          grams: f.grams,
        }),
      },
    });

  const addNow = async (f: RecentFood) => {
    await addFood({
      day,
      mealType: meal,
      food: { name: f.name, calories: f.calories, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, grams: f.grams },
    });
    setAdded((s) => new Set(s).add(f.name));
  };

  return (
    <Screen
      title="Add food"
      eyebrow={isToday ? undefined : dayLabel(day)}
      edges={['top', 'bottom']}
      footer={added.size > 0 ? <Button label="Done" onPress={() => router.back()} /> : undefined}>
      <Segmented value={meal} onChange={setMeal} options={MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))} />

      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Search size={18} strokeWidth={1.8} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods you’ve had before"
          placeholderTextColor={colors.muted}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel="Search foods"
          returnKeyType="search"
          style={[typeScale.body, styles.searchInput, { color: colors.text }]}
        />
      </View>

      <Button variant="secondary" label="Quick add calories" onPress={() => quickAdd()} />

      {recent.length === 0 ? (
        <Text variant="label" muted style={styles.note}>
          Foods you log show up here, so you can add them again in one tap.
        </Text>
      ) : matches.length === 0 ? (
        <Card>
          <Text variant="body" muted>
            Nothing you’ve logged matches “{query.trim()}”.
          </Text>
          <Button variant="secondary" label={`Quick add “${query.trim()}”`} onPress={() => quickAdd(query.trim())} />
        </Card>
      ) : (
        <Card title={query.trim() ? 'Matches' : 'Recent'} style={styles.list}>
          {matches.map((f, i) => {
            const done = added.has(f.name);
            const macros = macroLine(f);
            return (
              <View
                key={f.name}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
                <Pressable
                  style={styles.rowText}
                  accessibilityRole="button"
                  accessibilityHint="Opens it so you can change the amount before adding"
                  onPress={() => open(f)}>
                  <Text variant="bodyMedium">{f.name}</Text>
                  <Text variant="caption" muted>
                    {formatNumber(f.calories)} calories
                    {f.grams != null ? ` · ${formatNumber(f.grams)} g` : ''}
                    {macros ? ` · ${macros}` : ''}
                  </Text>
                </Pressable>
                {done ? (
                  <View style={styles.tap} accessible accessibilityLabel={`${f.name} added`}>
                    <Check size={20} strokeWidth={2} color={colors.text} />
                  </View>
                ) : (
                  <AddButton icon={Plus} accessibilityLabel={`Add ${f.name}`} onPress={() => addNow(f)} />
                )}
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    minHeight: 52,
  },
  searchInput: { flex: 1, paddingVertical: space[2] },
  note: { paddingHorizontal: space[1] },
  list: { gap: 0, paddingVertical: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 60, paddingVertical: space[2] },
  rowText: { flex: 1, gap: 2 },
  tap: { width: layout.minTap, height: layout.minTap, alignItems: 'center', justifyContent: 'center' },
});
