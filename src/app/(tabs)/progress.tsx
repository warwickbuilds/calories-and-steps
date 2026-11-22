import { Card, Screen, Text } from '@/components/ui';
import { useLatestWeight, useProfile } from '@/hooks/data';
import { bmi, bmiCategory } from '@/lib/body';

/** Body fat (Navy method), progress photos and timeline arrive in Phase 2. */
export default function ProgressScreen() {
  const { profile } = useProfile();
  const latest = useLatestWeight();
  const value = latest && profile ? bmi(latest.weightKg, profile.heightCm) : null;
  return (
    <Screen title="Progress">
      <Card title="Body fat (Navy method)">
        <Text variant="label" muted>
          Neck and waist check-ins with progress photos are coming in the next update.
        </Text>
      </Card>
      {value ? (
        <Card title="BMI">
          <Text variant="bigMetric">{value.toFixed(1)}</Text>
          <Text variant="label" muted>
            {bmiCategory(value)}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
