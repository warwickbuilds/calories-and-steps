import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

import { Text } from './Text';

/** Vertical list of selectable rows (title + hint), e.g. activity level. */
export function OptionList<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | null;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: selected ? colors.text : colors.surface },
            ]}>
            <View style={styles.textCol}>
              <Text variant="bodyStrong">{o.label}</Text>
              {o.hint ? (
                <Text variant="label" muted>
                  {o.hint}
                </Text>
              ) : null}
            </View>
            <View
              style={[
                styles.dot,
                { borderColor: selected ? colors.text : colors.line },
                selected && { backgroundColor: colors.text },
              ]}>
              {selected ? <Check size={14} strokeWidth={3} color={colors.surface} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md + 4,
    padding: space[4],
    gap: space[3],
  },
  textCol: { flex: 1, gap: 2 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
