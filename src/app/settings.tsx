import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { AgeField } from '@/components/fields/AgeField';
import { DateField } from '@/components/fields/DateField';
import { HeightField } from '@/components/fields/HeightField';
import { StepTargetSlider } from '@/components/fields/StepTargetSlider';
import { WeightField } from '@/components/fields/WeightField';
import { AiKeyCard } from '@/components/AiKeyCard';
import { StepsAccessCard } from '@/components/StepsAccessCard';
import { TargetSummary } from '@/components/TargetSummary';
import { Button, Card, OptionList, Screen, Segmented, Text } from '@/components/ui';
import { updateProfile } from '@/db/queries';
import { useProfile, useTargets } from '@/hooks/data';
import { toLocalDateString } from '@/lib/dates';
import { checkForUpdate, installedVersion, type CheckResult } from '@/lib/updates';
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
        <DateField
          label="Target date (optional)"
          value={profile.goalDate}
          onChange={(goalDate) => updateProfile({ goalDate })}
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
        <StepsAccessCard />
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

      <Section title="AI">
        <AiKeyCard />
      </Section>

      <Section title="Your data">
        <Card>
          <Text variant="bodyStrong">Stored on this phone only</Text>
          <Text variant="label" muted>
            There is no account or cloud copy. Uninstalling the app, or clearing its storage, deletes your meals,
            weights, check-ins and photos for good. Installing a new version over the top keeps everything.
          </Text>
          <Text variant="label" muted>
            Backup export and restore arrive in a later update.
          </Text>
          <Button
            variant="secondary"
            label="Import weights from screenshots"
            onPress={() => router.push('/import-weights')}
          />
        </Card>
      </Section>

      <AppVersionSection />
    </Screen>
  );
}

function AppVersionSection() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  const check = async () => {
    setChecking(true);
    setResult(await checkForUpdate());
    setChecking(false);
  };

  return (
    <Section title="About">
      <Card>
        <Text variant="body">Version {installedVersion() ?? 'unknown'}</Text>
        {result?.status === 'current' ? (
          <Text variant="label" muted>
            You have the latest version.
          </Text>
        ) : null}
        {result?.status === 'unavailable' ? (
          <Text variant="label" muted>
            Couldn’t reach GitHub. Check your connection and try again.
          </Text>
        ) : null}
        {result?.status === 'update' ? (
          <>
            <Text variant="label" muted>
              Version {result.update.version} is available. Download the APK and open it to install over this one.
            </Text>
            <Button label="Download" onPress={() => Linking.openURL(result.update.downloadUrl)} />
          </>
        ) : Platform.OS === 'android' ? (
          <Button variant="secondary" label="Check for updates" loading={checking} onPress={check} />
        ) : null}
      </Card>
      <Card>
        <Text variant="bodyMedium">Food data</Text>
        <Text variant="label" muted>
          Barcode lookups use Open Food Facts, a free, open database of food products made by volunteers, available under
          the Open Database License. Products you scan are saved on this phone.
        </Text>
        <Button
          variant="secondary"
          label="Open Food Facts website"
          onPress={() => Linking.openURL('https://world.openfoodfacts.org')}
        />
      </Card>
    </Section>
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
