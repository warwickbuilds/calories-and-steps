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
  const { colors, scheme } = useTheme();
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
            style={[
              styles.option,
              selected && { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 },
              selected && scheme === 'light' && styles.selectedShadow,
            ]}>
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
  selectedShadow: {
    shadowColor: '#0E1111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
});
