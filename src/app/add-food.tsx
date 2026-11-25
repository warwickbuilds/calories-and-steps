import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Check, FileText, Mic, PencilLine, Plus, ScanBarcode, Search, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FoodIcon } from '@/components/FoodIcon';
import { AddButton, Button, Card, Screen, Segmented, Text } from '@/components/ui';
import { addFood } from '@/db/meals';
import { useRecentFoods } from '@/hooks/data';
import { toLocalDateString } from '@/lib/dates';
import { dayLabel, formatAmount, macroLine, searchFoods, type RecentFood } from '@/lib/food';
import { hapticSuccess } from '@/lib/haptics';
import { MEAL_TYPES, formatNumber, isLocalDate, isMealType, type MealType } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, radius, space, type as typeScale } from '@/theme/tokens';

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
          unit: f.unit,
          category: f.category,
        }),
      },
    });

  const addNow = async (f: RecentFood) => {
    await addFood({
      day,
      mealType: meal,
      food: {
        name: f.name,
        calories: f.calories,
        proteinG: f.proteinG,
        carbsG: f.carbsG,
        fatG: f.fatG,
        grams: f.grams,
        unit: f.unit,
        category: f.category,
      },
    });
    hapticSuccess();
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

      <View style={styles.actions}>
        <ActionTile
          icon={Camera}
          label="Photo of meal"
          onPress={() => router.push({ pathname: '/scan', params: { meal, day, mode: 'meal' } })}
        />
        <ActionTile icon={Mic} label="Describe it" onPress={() => router.push({ pathname: '/estimate', params: { meal, day } })} />
      </View>
      <View style={styles.actions}>
        <ActionTile
          icon={ScanBarcode}
          label="Scan barcode"
          onPress={() => router.push({ pathname: '/scan', params: { meal, day } })}
        />
        <ActionTile
          icon={FileText}
          label="Read a label"
          onPress={() => router.push({ pathname: '/scan', params: { meal, day, mode: 'label' } })}
        />
        <ActionTile icon={PencilLine} label="Quick add" onPress={() => quickAdd()} />
      </View>

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
                <FoodIcon food={f} />
                <Pressable
                  style={styles.rowText}
                  accessibilityRole="button"
                  accessibilityHint="Opens it so you can change the amount before adding"
                  onPress={() => open(f)}>
                  <Text variant="bodyMedium">{f.name}</Text>
                  <Text variant="caption" muted>
                    {formatNumber(f.calories)} calories
                    {f.grams != null ? ` · ${formatAmount(f.grams, f.unit)}` : ''}
                    {macros ? ` · ${macros}` : ''}
                  </Text>
                </Pressable>
                {done ? (
                  <View style={[styles.doneBadge, { backgroundColor: colors.caloriesSoft }]} accessible accessibilityLabel={`${f.name} added`}>
                    <Check size={18} strokeWidth={2.4} color={colors.calories} />
                  </View>
                ) : (
                  <AddButton icon={Plus} tone="calories" accessibilityLabel={`Add ${f.name}`} onPress={() => addNow(f)} />
                )}
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

function ActionTile({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.75 : 1 },
      ]}>
      <View style={[styles.tileIcon, { backgroundColor: colors.caloriesSoft }]}>
        <Icon size={20} strokeWidth={1.9} color={colors.calories} />
      </View>
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space[2] },
  tile: {
    flex: 1,
    minHeight: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[3],
  },
  tileIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
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
  doneBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
