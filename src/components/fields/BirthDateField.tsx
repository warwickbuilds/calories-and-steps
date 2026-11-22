import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { ageOn } from '@/lib/energy';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const DEFAULT_BIRTH = '1990-01-01';

export function BirthDateField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (isoDate: string) => void;
}) {
  const { colors, scheme } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const date = fromLocalDateString(value ?? DEFAULT_BIRTH);
  const max = new Date();
  max.setFullYear(max.getFullYear() - 16);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        maximumDate: max,
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(toLocalDateString(d));
        },
      });
    } else {
      setIosOpen((o) => !o);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text variant="label" muted>
        Date of birth
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text variant="bodyMedium" muted={!value}>
          {value
            ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
            : 'Choose a date'}
        </Text>
        {value ? (
          <Text variant="label" muted>
            {ageOn(value)} years
          </Text>
        ) : null}
      </Pressable>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          maximumDate={max}
          themeVariant={scheme}
          onChange={(_, d) => d && onChange(toLocalDateString(d))}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] },
  box: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    minHeight: 52,
  },
});
