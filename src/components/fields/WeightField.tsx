import { useState } from 'react';

import { NumberField } from '@/components/ui';
import { LIMITS, inRange } from '@/lib/validation';
import {
  fromDisplayWeight,
  parseDecimal,
  toDisplayWeight,
  weightUnitLabel,
  type UnitSystem,
} from '@/lib/units';

const show = (kg: number | null, units: UnitSystem) =>
  kg == null ? '' : String(Math.round(toDisplayWeight(kg, units) * 10) / 10);

/** Weight input in the user's units; reports kg (or null when empty/invalid). */
export function WeightField({
  label,
  units,
  valueKg,
  onChangeKg,
  onSubmitEditing,
  placeholder,
}: {
  label?: string;
  units: UnitSystem;
  valueKg: number | null;
  onChangeKg: (kg: number | null) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => show(valueKg, units));
  const [shownUnits, setShownUnits] = useState(units);

  // Re-show the number in the new unit when the unit system changes.
  if (shownUnits !== units) {
    setShownUnits(units);
    setText(show(valueKg, units));
  }

  const n = parseDecimal(text);
  const kg = n == null ? null : fromDisplayWeight(n, units);
  const error = text !== '' && !inRange(kg, LIMITS.weightKg) ? 'Check this weight' : null;

  return (
    <NumberField
      label={label}
      unit={weightUnitLabel(units)}
      value={text}
      placeholder={placeholder}
      error={error}
      returnKeyType="done"
      onSubmitEditing={onSubmitEditing}
      onChangeText={(t) => {
        setText(t);
        const v = parseDecimal(t);
        const next = v == null ? null : fromDisplayWeight(v, units);
        onChangeKg(inRange(next, LIMITS.weightKg) ? next : null);
      }}
    />
  );
}
