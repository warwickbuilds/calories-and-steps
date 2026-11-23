import { Trash2 } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { deleteFoodItem } from '@/db/meals';
import { useDayItems } from '@/hooks/data';
import { formatLongDate, toLocalDateString } from '@/lib/dates';
import { MEAL_TYPES, formatNumber } from '@/lib/today';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

/** Today's food, grouped by meal. Day-by-day history arrives with AI meal logging (Phase 3). */
export default function FoodScreen() {
  const { colors } = useTheme();
  const items = useDayItems(toLocalDateString());

  const confirmDelete = (id: number, name: string) =>
    Alert.alert(`Delete ${name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFoodItem(id) },
    ]);

  return (
    <Screen eyebrow={formatLongDate()} title="Food">
      {MEAL_TYPES.map((m) => {
        const rows = items.filter((i) => i.mealType === m.value);
        const total = rows.reduce((s, r) => s + r.calories, 0);
        return (
          <Card
            key={m.value}
            title={m.label}
            right={
              <Text variant="label" muted>
                {rows.length ? `${formatNumber(total)} calories` : 'Not logged'}
              </Text>
            }>
            {rows.map((r) => (
              <View key={r.id} style={[styles.row, { borderTopColor: colors.line }]}>
                <View style={styles.flex}>
                  <Text variant="bodyMedium">{r.name}</Text>
                  <Text variant="caption" muted>
                    {formatNumber(r.calories)} calories
                    {r.proteinG != null ? ` · P ${Math.round(r.proteinG)}g` : ''}
                    {r.carbsG != null ? ` · C ${Math.round(r.carbsG)}g` : ''}
                    {r.fatG != null ? ` · F ${Math.round(r.fatG)}g` : ''}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${r.name}`}
                  onPress={() => confirmDelete(r.id, r.name)}
                  style={styles.delete}>
                  <Trash2 size={18} strokeWidth={1.8} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingTop: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  delete: { width: layout.minTap, height: layout.minTap, alignItems: 'center', justifyContent: 'center' },
});
