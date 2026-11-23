import { useState } from 'react';

import { NumberField } from '@/components/ui';
import { parseDecimal } from '@/lib/units';
import { LIMITS, inRange } from '@/lib/validation';

/** Age in whole years. Reports the age, or null when empty or out of range. */
export function AgeField({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (age: number | null) => void;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const n = parseDecimal(text);
  const age = n == null ? null : Math.round(n);
  const error = text !== '' && !inRange(age, LIMITS.age) ? 'Enter an age from 16 to 100' : null;
  return (
    <NumberField
      label="Age"
      unit="years"
      keyboardType="number-pad"
      value={text}
      error={error}
      onChangeText={(t) => {
        setText(t);
        const v = parseDecimal(t);
        const next = v == null ? null : Math.round(v);
        onChange(inRange(next, LIMITS.age) ? next : null);
      }}
    />
  );
}
