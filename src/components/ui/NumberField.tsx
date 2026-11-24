import { ArrowLeftRight } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

import { Text } from './Text';

export function NumberField({
  label,
  unit,
  onUnitPress,
  unitHint,
  value,
  onChangeText,
  error,
  ...rest
}: {
  label?: string;
  unit?: string;
  /** Makes the unit a small button, e.g. to switch between g and ml. */
  onUnitPress?: () => void;
  unitHint?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
} & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" muted>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.line },
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.muted}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[styles.input, typeScale.metric, { fontSize: 20, color: colors.text }]}
          accessibilityLabel={label}
          {...rest}
        />
        {unit && onUnitPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Unit: ${unit === 'ml' ? 'millilitres' : unit === 'g' ? 'grams' : unit}`}
            accessibilityHint={unitHint}
            hitSlop={8}
            onPress={onUnitPress}
            style={[styles.unitButton, { backgroundColor: colors.track }]}>
            <Text variant="label">{unit}</Text>
            <ArrowLeftRight size={12} strokeWidth={2} color={colors.muted} />
          </Pressable>
        ) : unit ? (
          <Text variant="label" muted>
            {unit}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1], flex: 1 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    minHeight: layout.minTap + 8,
    gap: space[2],
  },
  input: { flex: 1, paddingVertical: space[2] },
  unitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
  },
});
