import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Check,
  Copy,
  Database,
  FileText,
  Mic,
  PencilLine,
  Plus,
  ScanBarcode,
  Search,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FoodIcon } from '@/components/FoodIcon';
import { AddButton, Button, Card, Screen, Segmented, Text } from '@/components/ui';
import { findByBarcode, saveFoodRef } from '@/db/foods';
import { addFood, copyMeal } from '@/db/meals';
import { useDayTotals, useRecentFoods } from '@/hooks/data';
import { useFoodDatabaseSearch, type FoodSearchState } from '@/hooks/foodSearch';
import { addDays, fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { dayLabel, formatAmount, macroLine, searchFoods, type RecentFood } from '@/lib/food';
import type { SearchHit } from '@/lib/foodSearch';
import { hapticSuccess } from '@/lib/haptics';
import { MEAL_TYPES, formatNumber, isLocalDate, isMealType, type MealType } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, radius, space, type as typeScale } from '@/theme/tokens';

/**
 * Where every "+" leads: search recent foods and the Open Food Facts database,
 * AI/barcode capture, quick add, or same as yesterday.
 */
export default function AddFoodScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ meal?: string; day?: string }>();
  const today = toLocalDateString();
  const day = isLocalDate(params.day) ? params.day : today;
  const [meal, setMeal] = useState<MealType>(isMealType(params.meal) ? params.meal : 'snack');
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);
  const recent = useRecentFoods();
  const matches = useMemo(() => searchFoods(recent, query), [recent, query]);
  const database = useFoodDatabaseSearch(query);
  const [opening, setOpening] = useState(false);
  const isToday = day === today;

  const prevDay = toLocalDateString(addDays(fromLocalDateString(day), -1));
  const prevTotals = useDayTotals(prevDay);
  const prevMeal = prevTotals.byMeal[meal];
  const prevLabel = dayLabel(prevDay, today);
  const canCopyYesterday = prevMeal.count > 0;

  const quickAdd = (name?: string) =>
    router.push({ pathname: '/quick-add', params: { meal, day, from: 'add', ...(name ? { name } : {}) } });

  const handleCopyYesterday = async () => {
    if (copying || !canCopyYesterday) return;
    setCopying(true);
    try {
      await copyMeal(meal, prevDay, day);
      hapticSuccess();
      router.back();
    } finally {
      setCopying(false);
    }
  };

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

  // Cache the product under its barcode (unless it's already saved, maybe with
  // the user's corrections), then open it like a scanned barcode.
  const openProduct = async (hit: SearchHit) => {
    if (opening) return;
    setOpening(true);
    try {
      if (!(await findByBarcode(hit.barcode))) await saveFoodRef(hit.food, 'off', hit.barcode);
      router.push({ pathname: '/product', params: { barcode: hit.barcode, meal, day } });
    } finally {
      setOpening(false);
    }
  };

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
          placeholder="Search foods"
          placeholderTextColor={colors.muted}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel="Search foods"
          returnKeyType="search"
          onSubmitEditing={() => void database.search()}
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
      </View>
      <View style={styles.actions}>
        <ActionTile icon={PencilLine} label="Quick add" onPress={() => quickAdd()} />
        {canCopyYesterday ? (
          <ActionTile
            icon={Copy}
            label={prevLabel === 'Yesterday' ? 'Same as yesterday' : `Same as ${prevLabel}`}
            hint={`${formatNumber(prevMeal.calories)} calories`}
            disabled={copying}
            onPress={() => void handleCopyYesterday()}
          />
        ) : null}
      </View>

      {recent.length === 0 && !query.trim() ? (
        <Text variant="label" muted style={styles.note}>
          Foods you log show up here, so you can add them again in one tap. Type a name to search the food database.
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

      {database.canSearch ? (
        <DatabaseCard
          state={database.state}
          homeName={database.home?.name ?? null}
          onSearch={(everywhere) => void database.search(everywhere)}
          onOpen={(hit) => void openProduct(hit)}
        />
      ) : null}
    </Screen>
  );
}

/** Open Food Facts results for what's typed, searched only on request. */
function DatabaseCard({
  state,
  homeName,
  onSearch,
  onOpen,
}: {
  state: FoodSearchState;
  homeName: string | null;
  onSearch: (everywhere?: boolean) => void;
  onOpen: (hit: SearchHit) => void;
}) {
  const { colors } = useTheme();
  if (state.kind === 'idle') {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onSearch()}
        style={({ pressed }) => [
          styles.dbButton,
          { backgroundColor: colors.surface, borderColor: colors.cardBorder, opacity: pressed ? 0.75 : 1 },
        ]}>
        <View style={[styles.tileIcon, { backgroundColor: colors.caloriesSoft }]}>
          <Database size={18} strokeWidth={1.9} color={colors.calories} />
        </View>
        <View style={styles.rowText}>
          <Text variant="bodyMedium">Search the food database</Text>
          <Text variant="caption" muted>
            Open Food Facts{homeName ? `, products sold in ${homeName} first` : ''}
          </Text>
        </View>
      </Pressable>
    );
  }
  if (state.kind === 'loading') {
    return (
      <Card>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.text} />
          <Text variant="body">Searching Open Food Facts…</Text>
        </View>
      </Card>
    );
  }
  if (state.kind === 'offline') {
    return (
      <Card>
        <Text variant="bodyStrong">Couldn’t reach Open Food Facts</Text>
        <Text variant="label" muted>
          Check your connection and try again.
        </Text>
        <Button variant="secondary" label="Try again" onPress={() => onSearch()} />
      </Card>
    );
  }
  const where = state.country ? state.country.name : 'All countries';
  return (
    <Card title="Food database" right={<Text variant="caption" muted>{where}</Text>} style={styles.list}>
      {state.hits.length === 0 ? (
        <Text variant="body" muted style={styles.empty}>
          No products match “{state.query}”. Try fewer words, or scan the barcode.
        </Text>
      ) : (
        state.hits.map((hit, i) => {
          const f = hit.food;
          const per = f.unit === 'ml' ? '100 ml' : '100 g';
          return (
            <Pressable
              key={hit.barcode}
              accessibilityRole="button"
              accessibilityHint="Opens it so you can choose the amount"
              onPress={() => onOpen(hit)}
              style={({ pressed }) => [
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
                { opacity: pressed ? 0.6 : 1 },
              ]}>
              <FoodIcon food={f} />
              <View style={styles.rowText}>
                <Text variant="bodyMedium">{f.name}</Text>
                <Text variant="caption" muted>
                  {f.brand ? `${f.brand} · ` : ''}
                  {formatNumber(f.caloriesPer100g)} calories per {per}
                  {f.servingG != null ? ` · serving ${formatAmount(f.servingG, f.unit)}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
      {state.country ? (
        <Button variant="ghost" label="Search all countries" onPress={() => onSearch(true)} />
      ) : null}
    </Card>
  );
}

function ActionTile({
  icon: Icon,
  label,
  hint,
  disabled,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}>
      <View style={[styles.tileIcon, { backgroundColor: colors.caloriesSoft }]}>
        <Icon size={20} strokeWidth={1.9} color={colors.calories} />
      </View>
      <Text variant="label" style={styles.tileLabel}>
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" muted style={styles.tabular}>
          {hint}
        </Text>
      ) : null}
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
    gap: space[1] + 2,
    paddingVertical: space[3],
    paddingHorizontal: space[2],
  },
  tileIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
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
  dbButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  empty: { paddingVertical: space[2] },
  list: { gap: 0, paddingVertical: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 60, paddingVertical: space[2] },
  rowText: { flex: 1, gap: 2 },
  doneBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
