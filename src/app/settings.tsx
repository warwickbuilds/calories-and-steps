import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AgeField } from '@/components/fields/AgeField';
import { DateField } from '@/components/fields/DateField';
import { HeightField } from '@/components/fields/HeightField';
import { StepTargetSlider } from '@/components/fields/StepTargetSlider';
import { WeightField } from '@/components/fields/WeightField';
import { AiKeyCard } from '@/components/AiKeyCard';
import { BackupCard } from '@/components/BackupCard';
import { RemindersCard } from '@/components/RemindersCard';
import { StepsAccessCard } from '@/components/StepsAccessCard';
import { TargetSummary } from '@/components/TargetSummary';
import { Button, Card, OptionList, Screen, Segmented, Text } from '@/components/ui';
import { updateProfile } from '@/db/queries';
import { useProfile, useTargets } from '@/hooks/data';
import { toLocalDateString } from '@/lib/dates';
import { hapticTick } from '@/lib/haptics';
import { checkForUpdate, installedVersion, type CheckResult } from '@/lib/updates';
import { ACTIVITY_LEVELS, GOAL_MODES, currentAge, type ActivityLevel, type GoalMode } from '@/lib/energy';
import { palettes, THEME_OPTIONS, type ThemePreference } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';

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
          onChangeKg={(goalWeightKg, empty) => {
            if (goalWeightKg != null || empty) updateProfile({ goalWeightKg: empty ? null : goalWeightKg });
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
        <ThemePicker
          value={profile.themePref}
          onChange={(themePref) => updateProfile({ themePref })}
        />
      </Section>

      <Section title="Reminders">
        <RemindersCard />
      </Section>

      <Section title="AI">
        <AiKeyCard showModelOverride />
      </Section>

      <Section title="Your data">
        <Card>
          <Text variant="bodyStrong">Stored on this phone only</Text>
          <Text variant="label" muted>
            There is no account or cloud copy. Uninstalling the app, or clearing its storage, deletes your meals,
            weights, check-ins and photos for good, unless you have a backup. Installing a new version over the top
            keeps everything.
          </Text>
          <Button
            variant="secondary"
            label="Import weights from screenshots"
            onPress={() => router.push('/import-weights')}
          />
        </Card>
        <BackupCard />
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
              Version {result.update.version} is available. Download the APK and open it to install over this one. Your data stays, but backing up first is a good idea.
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

function ThemePicker({
  value,
  onChange,
}: {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}) {
  const { colors } = useTheme();
  return (
    <Card>
      <View style={styles.themeList} accessibilityRole="radiogroup" accessibilityLabel="Appearance theme">
        {THEME_OPTIONS.map((opt, idx) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${opt.label}. ${opt.hint}`}
              onPress={() => {
                if (!selected) hapticTick();
                onChange(opt.value);
              }}
              style={({ pressed }) => [
                styles.themeRow,
                idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
                pressed && { opacity: 0.72 },
              ]}>
              <ThemeSwatch preference={opt.value} borderColor={selected ? colors.text : colors.cardBorder} />
              <View style={styles.themeText}>
                <Text variant={selected ? 'bodyStrong' : 'bodyMedium'}>{opt.label}</Text>
                <Text variant="caption" muted>
                  {opt.hint}
                </Text>
              </View>
              {selected ? <Check size={18} strokeWidth={2.3} color={colors.text} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function ThemeSwatch({ preference, borderColor }: { preference: ThemePreference; borderColor: string }) {
  if (preference === 'system') {
    return (
      <View style={[styles.swatch, { borderColor }]}>
        <View style={[styles.swatchHalf, { backgroundColor: palettes.light.bg }]} />
        <View style={[styles.swatchHalf, { backgroundColor: palettes.dark.bg }]} />
      </View>
    );
  }
  const p = palettes[preference];
  return (
    <View style={[styles.swatch, { backgroundColor: p.bg, borderColor }]}>
      <View style={[styles.swatchCard, { backgroundColor: p.surface, borderColor: p.cardBorder }]}>
        <View style={[styles.swatchDot, { backgroundColor: p.steps }]} />
        <View style={[styles.swatchDot, { backgroundColor: p.calories }]} />
      </View>
    </View>
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
  themeList: { gap: 0 },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: layout.minTap + 6,
    paddingVertical: space[2],
  },
  themeText: { flex: 1, gap: 1 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  swatchHalf: { flex: 1, height: '100%' },
  swatchCard: {
    width: 22,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  swatchDot: { width: 5, height: 5, borderRadius: 2.5 },
});
