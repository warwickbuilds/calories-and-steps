import { useState } from 'react';

import { NumberField } from '@/components/ui';
import { fromDisplayLength, lengthUnitLabel, parseDecimal, toDisplayLength, type UnitSystem } from '@/lib/units';

const show = (cm: number | null, units: UnitSystem) =>
  cm == null ? '' : String(Math.round(toDisplayLength(cm, units) * 10) / 10);

/** A body measurement in cm or inches. Reports cm, or null when empty or out of range. */
export function LengthField({
  label,
  units,
  valueCm,
  onChangeCm,
  minCm = 20,
  maxCm = 250,
}: {
  label: string;
  units: UnitSystem;
  valueCm: number | null;
  onChangeCm: (cm: number | null) => void;
  minCm?: number;
  maxCm?: number;
}) {
  const [text, setText] = useState(() => show(valueCm, units));
  const n = parseDecimal(text);
  const cm = n == null ? null : fromDisplayLength(n, units);
  const ok = (v: number | null) => v != null && v >= minCm && v <= maxCm;
  return (
    <NumberField
      label={label}
      unit={lengthUnitLabel(units)}
      value={text}
      error={text !== '' && !ok(cm) ? 'Check this measurement' : null}
      onChangeText={(t) => {
        setText(t);
        const v = parseDecimal(t);
        const next = v == null ? null : fromDisplayLength(v, units);
        onChangeCm(ok(next) ? next : null);
      }}
    />
  );
}
