import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { addDays, fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

/**
 * A date (YYYY-MM-DD). By default a future date, e.g. a goal date, optional
 * with a Clear action. Pass `past` for a day up to today that is always set,
 * e.g. when a check-in happened.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Not set',
  past = false,
}: {
  label: string;
  value: string | null;
  onChange: (isoDate: string | null) => void;
  placeholder?: string;
  past?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const min = past ? undefined : addDays(new Date(), 1);
  const max = past ? new Date() : undefined;
  const date = value ? fromLocalDateString(value) : past ? new Date() : addDays(new Date(), 90);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate: min,
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
        {label}
      </Text>
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={open} style={styles.flex}>
          <Text variant="bodyMedium" muted={!value}>
            {value
              ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
              : placeholder}
          </Text>
        </Pressable>
        {value && !past ? (
          <Pressable accessibilityRole="button" onPress={() => onChange(null)} style={styles.clear}>
            <Text variant="label" muted>
              Clear
            </Text>
          </Pressable>
        ) : null}
      </View>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          minimumDate={min}
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
  flex: { flex: 1, minHeight: layout.minTap, justifyContent: 'center' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    minHeight: 52,
  },
  clear: { minHeight: layout.minTap, justifyContent: 'center', paddingLeft: space[3] },
});
