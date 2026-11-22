import { Card, Text } from '@/components/ui';
import type { DailyTargets } from '@/lib/energy';
import { formatNumber } from '@/lib/today';

export function TargetSummary({ targets }: { targets: DailyTargets }) {
  return (
    <Card>
      <Text variant="label" muted>
        Your daily target
      </Text>
      <Text variant="bigMetric">
        {formatNumber(targets.calories)}
        <Text variant="body" muted>
          {' '}
          calories
        </Text>
      </Text>
      <Text variant="label" muted>
        Maintenance is about {formatNumber(targets.maintenance)} calories a day. Protein {targets.proteinG}g,
        carbs {targets.carbsG}g, fat {targets.fatG}g.
      </Text>
      {targets.flooredAtMinimum ? (
        <Text variant="label" muted>
          We’ve kept your target at a safe minimum rather than going lower.
        </Text>
      ) : null}
    </Card>
  );
}
