import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AgeField } from '@/components/fields/AgeField';
import { HeightField } from '@/components/fields/HeightField';
import { StepTargetSlider } from '@/components/fields/StepTargetSlider';
import { WeightField } from '@/components/fields/WeightField';
import { TargetSummary } from '@/components/TargetSummary';
import { Card, OptionList, Screen, Segmented, Text } from '@/components/ui';
import { updateProfile } from '@/db/queries';
import { useProfile, useTargets } from '@/hooks/data';
import { toLocalDateString } from '@/lib/dates';
import { ACTIVITY_LEVELS, GOAL_MODES, currentAge, type ActivityLevel, type GoalMode } from '@/lib/energy';
import { space } from '@/theme/tokens';

export default function SettingsScreen() {
  const { profile } = useProfile();
  const targets = useTargets();
  const [steps, setSteps] = useState<number | null>(null);

  if (!profile) return null;
  const units = profile.unitPref;

  return (
    <Screen edges={[]}>
      <Section title="Your target">{targets ? <TargetSummary targets={targets} /> : null}</Section>

      <Section title="Goal">
        <OptionList
          value={profile.goalMode}
          onChange={(goalMode) => updateProfile({ goalMode })}
          options={(Object.keys(GOAL_MODES) as GoalMode[]).map((k) => ({
            value: k,
            label: GOAL_MODES[k].label,
            hint: GOAL_MODES[k].hint,
          }))}
        />
        <WeightField
          label="Goal weight"
          units={units}
          valueKg={profile.goalWeightKg}
          placeholder="Not set"
          onChangeKg={(goalWeightKg) => {
            if (goalWeightKg != null) updateProfile({ goalWeightKg });
          }}
        />
      </Section>

      <Section title="Daily steps">
        <Card>
          <StepTargetSlider
            value={steps ?? profile.stepTarget}
            onChange={setSteps}
            onComplete={(stepTarget) => {
              setSteps(null);
              updateProfile({ stepTarget });
            }}
          />
        </Card>
      </Section>

      <Section title="About you">
        <Segmented
          value={profile.sex}
          onChange={(sex) => updateProfile({ sex })}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
        />
        <AgeField
          value={currentAge(profile.ageYears, profile.ageSetOn)}
          onChange={(ageYears) => {
            if (ageYears != null) updateProfile({ ageYears, ageSetOn: toLocalDateString() });
          }}
        />
        <HeightField
          units={units}
          valueCm={profile.heightCm}
          onChangeCm={(heightCm) => {
            if (heightCm != null) updateProfile({ heightCm });
          }}
        />
      </Section>

      <Section title="Activity">
        <OptionList
          value={profile.activityLevel}
          onChange={(activityLevel) => updateProfile({ activityLevel })}
          options={(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((k) => ({
            value: k,
            label: ACTIVITY_LEVELS[k].label,
            hint: ACTIVITY_LEVELS[k].hint,
          }))}
        />
      </Section>

      <Section title="Units">
        <Segmented
          value={units}
          onChange={(unitPref) => updateProfile({ unitPref })}
          options={[
            { value: 'metric', label: 'Metric (kg, cm)' },
            { value: 'imperial', label: 'Imperial (lb, in)' },
          ]}
        />
      </Section>

      <Section title="Appearance">
        <Segmented
          value={profile.themePref}
          onChange={(themePref) => updateProfile({ themePref })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Section>

      <Section title="Your data">
        <Text variant="label" muted>
          Everything is stored on this phone only. Backup and restore arrive in a later update.
        </Text>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[3], marginTop: space[3] },
});
