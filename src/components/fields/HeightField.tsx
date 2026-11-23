import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NumberField } from '@/components/ui';
import { cmToFeetInches, feetInchesToCm, parseDecimal, type UnitSystem } from '@/lib/units';
import { LIMITS, inRange } from '@/lib/validation';
import { space } from '@/theme/tokens';

function initial(cm: number | null) {
  if (cm == null) return { cm: '', ft: '', inch: '' };
  const { feet, inches } = cmToFeetInches(cm);
  return { cm: String(Math.round(cm)), ft: String(feet), inch: String(Math.round(inches)) };
}

/** Height in cm, or feet + inches for imperial. Reports cm (or null). */
export function HeightField({
  units,
  valueCm,
  onChangeCm,
}: {
  units: UnitSystem;
  valueCm: number | null;
  onChangeCm: (cm: number | null) => void;
}) {
  const [t, setT] = useState(() => initial(valueCm));
  const [shownUnits, setShownUnits] = useState(units);

  // Re-show the height in the new unit when the unit system changes.
  if (shownUnits !== units) {
    setShownUnits(units);
    setT(initial(valueCm));
  }

  const report = (next: typeof t) => {
    setT(next);
    let cm: number | null;
    if (units === 'metric') {
      cm = parseDecimal(next.cm);
    } else {
      const ft = parseDecimal(next.ft);
      const inch = parseDecimal(next.inch) ?? 0;
      cm = ft == null ? null : feetInchesToCm(ft, inch);
    }
    onChangeCm(inRange(cm, LIMITS.heightCm) ? cm : null);
  };

  const touched = units === 'metric' ? t.cm !== '' : t.ft !== '';
  const error = touched && !inRange(valueCm, LIMITS.heightCm) ? 'Check this height' : null;

  if (units === 'metric') {
    return (
      <NumberField
        label="Height"
        unit="cm"
        keyboardType="number-pad"
        value={t.cm}
        error={error}
        onChangeText={(cm) => report({ ...t, cm })}
      />
    );
  }
  return (
    <View style={styles.row}>
      <NumberField
        label="Height"
        unit="ft"
        keyboardType="number-pad"
        value={t.ft}
        error={error}
        onChangeText={(ft) => report({ ...t, ft })}
      />
      <NumberField
        label=" "
        unit="in"
        value={t.inch}
        onChangeText={(inch) => report({ ...t, inch })}
      />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: space[2] } });
