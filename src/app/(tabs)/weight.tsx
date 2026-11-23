import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Trash2 } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { allWeightsQuery, deleteWeight } from '@/db/queries';
import { useProfile } from '@/hooks/data';
import { bmi, bmiCategory } from '@/lib/body';
import { formatWeight } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/tokens';

/** Weight log. Charts, change cards and goal projection arrive in Phase 2. */
export default function WeightScreen() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { data: entries = [] } = useLiveQuery(allWeightsQuery());
  const units = profile?.unitPref ?? 'metric';
  const latest = entries[0];
  const bmiValue = latest && profile ? bmi(latest.weightKg, profile.heightCm) : null;

  return (
    <Screen title="Weight">
      {latest ? (
        <Card>
          <Text variant="label" muted>
            Latest
          </Text>
          <Text variant="bigMetric">{formatWeight(latest.weightKg, units)}</Text>
          {bmiValue ? (
            <Text variant="label" muted>
              BMI {bmiValue.toFixed(1)} · {bmiCategory(bmiValue)}
            </Text>
          ) : null}
          {profile?.goalWeightKg ? (
            <Text variant="label" muted>
              Goal {formatWeight(profile.goalWeightKg, units)}
            </Text>
          ) : null}
        </Card>
      ) : null}
      <Card title="History">
        {entries.length === 0 ? (
          <Text variant="label" muted>
            Log your weight from the Today screen.
          </Text>
        ) : null}
        {entries.map((e) => (
          <View key={e.id} style={[styles.row, { borderTopColor: colors.line }]}>
            <Text variant="bodyMedium" style={styles.flex}>
              {new Date(e.measuredAt).toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
              {formatWeight(e.weightKg, units)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete this entry"
              style={styles.delete}
              onPress={() =>
                Alert.alert('Delete this entry?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteWeight(e.id) },
                ])
              }>
              <Trash2 size={18} strokeWidth={1.8} color={colors.muted} />
            </Pressable>
          </View>
        ))}
      </Card>
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
