import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

import { Text } from './Text';

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.track }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.option, selected && { backgroundColor: colors.surface }]}>
            <Text variant={selected ? 'bodyStrong' : 'bodyMedium'} muted={!selected}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.pill, padding: 3 },
  option: {
    flex: 1,
    minHeight: layout.minTap - 6,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[2],
  },
});
