import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { addDays, fromLocalDateString, toLocalDateString } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

/** A future date (YYYY-MM-DD), e.g. a goal date. Optional, with a Clear action. */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Not set',
}: {
  label: string;
  value: string | null;
  onChange: (isoDate: string | null) => void;
  placeholder?: string;
}) {
  const { colors, scheme } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const min = addDays(new Date(), 1);
  const date = value ? fromLocalDateString(value) : addDays(new Date(), 90);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        minimumDate: min,
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
        {value ? (
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
