import { History } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AiKeyCard } from '@/components/AiKeyCard';
import { AgeField } from '@/components/fields/AgeField';
import { HeightField } from '@/components/fields/HeightField';
import { StepTargetSlider } from '@/components/fields/StepTargetSlider';
import { WeightField } from '@/components/fields/WeightField';
import { TargetSummary } from '@/components/TargetSummary';
import { Button, Card, OptionList, Screen, Segmented, Text } from '@/components/ui';
import { addWeight, saveProfile } from '@/db/queries';
import {
  ACTIVITY_LEVELS,
  GOAL_MODES,
  STEP_TARGET,
  dailyTargets,
  type ActivityLevel,
  type GoalMode,
  type Sex,
} from '@/lib/energy';
import { toLocalDateString } from '@/lib/dates';
import { requestImportAfterOnboarding } from '@/lib/onboardingIntent';
import type { UnitSystem } from '@/lib/units';
import { LIMITS, inRange } from '@/lib/validation';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const APP_NAME = 'Calories and Steps';

interface Draft {
  units: UnitSystem;
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goalWeightKg: number | null;
  activity: ActivityLevel | null;
  goal: GoalMode;
  stepTarget: number;
}

const STEPS = ['welcome', 'about', 'weight', 'activity', 'goal', 'steps', 'ai', 'history'] as const;

export default function Onboarding() {
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<Draft>({
    units: 'metric',
    sex: null,
    age: null,
    heightCm: null,
    weightKg: null,
    goalWeightKg: null,
    activity: null,
    goal: 'steady_cut',
    stepTarget: STEP_TARGET.default,
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const name = STEPS[step];
  const canContinue =
    name === 'about'
      ? !!d.sex && inRange(d.age, LIMITS.age) && inRange(d.heightCm, LIMITS.heightCm)
      : name === 'weight'
        ? inRange(d.weightKg, LIMITS.weightKg)
        : name === 'activity'
          ? !!d.activity
          : true;

  const targets =
    d.sex && d.age && d.heightCm && d.weightKg && d.activity
      ? dailyTargets({
          sex: d.sex,
          age: d.age,
          heightCm: d.heightCm,
          weightKg: d.weightKg,
          activity: d.activity,
          goal: d.goal,
        })
      : null;

  const finish = async (thenImport = false) => {
    if (!d.sex || !d.age || !d.heightCm || !d.weightKg || !d.activity) return;
    setSaving(true);
    if (thenImport) requestImportAfterOnboarding();
    try {
      await addWeight(d.weightKg);
      // Saving the profile flips navigation over to the Today screen.
      await saveProfile({
        sex: d.sex,
        ageYears: d.age,
        ageSetOn: toLocalDateString(),
        heightCm: d.heightCm,
        activityLevel: d.activity,
        unitPref: d.units,
        goalWeightKg: d.goalWeightKg,
        goalMode: d.goal,
        stepTarget: d.stepTarget,
      });
    } finally {
      setSaving(false);
    }
  };

  const last = step === STEPS.length - 1;

  return (
    <Screen
      eyebrow={step === 0 ? undefined : `Step ${step} of ${STEPS.length - 1}`}
      title={TITLES[name]}
      edges={['top', 'bottom']}
      footer={
        <View style={styles.footer}>
          {step > 0 ? <Button variant="secondary" label="Back" onPress={() => setStep(step - 1)} /> : null}
          <View style={styles.flex}>
            <Button
              label={step === 0 ? 'Get started' : last ? 'Skip for now' : 'Continue'}
              disabled={!canContinue}
              loading={saving}
              onPress={() => (last ? finish() : setStep(step + 1))}
            />
          </View>
        </View>
      }>
      <View style={styles.progress} accessible={false}>
        {STEPS.slice(1).map((s, i) => (
          <View
            key={s}
            style={[styles.progressSeg, { backgroundColor: i < step ? colors.text : colors.track }]}
          />
        ))}
      </View>

      {name === 'welcome' ? (
        <View style={styles.section}>
          <Text variant="body" muted>
            {APP_NAME} tracks your calories, steps and weight. Everything stays on your phone. There’s
            no account to make.
          </Text>
          <Text variant="label" muted>
            Units
          </Text>
          <Segmented
            value={d.units}
            onChange={(v) => set('units', v)}
            options={[
              { value: 'metric', label: 'Metric (kg, cm)' },
              { value: 'imperial', label: 'Imperial (lb, in)' },
            ]}
          />
        </View>
      ) : null}

      {name === 'about' ? (
        <View style={styles.section}>
          <Text variant="body" muted>
            Used to work out the calories your body burns in a day.
          </Text>
          <Text variant="label" muted>
            Sex
          </Text>
          <Segmented
            value={d.sex ?? ('' as Sex)}
            onChange={(v) => set('sex', v)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
          <AgeField value={d.age} onChange={(v) => set('age', v)} />
          <HeightField units={d.units} valueCm={d.heightCm} onChangeCm={(v) => set('heightCm', v)} />
        </View>
      ) : null}

      {name === 'weight' ? (
        <View style={styles.section}>
          <WeightField
            label="Current weight"
            units={d.units}
            valueKg={d.weightKg}
            onChangeKg={(v) => set('weightKg', v)}
          />
          <WeightField
            label="Goal weight (optional)"
            units={d.units}
            valueKg={d.goalWeightKg}
            onChangeKg={(v) => set('goalWeightKg', v)}
          />
        </View>
      ) : null}

      {name === 'activity' ? (
        <OptionList
          value={d.activity}
          onChange={(v) => set('activity', v)}
          options={(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((k) => ({
            value: k,
            label: ACTIVITY_LEVELS[k].label,
            hint: ACTIVITY_LEVELS[k].hint,
          }))}
        />
      ) : null}

      {name === 'goal' ? (
        <View style={styles.section}>
          <OptionList
            value={d.goal}
            onChange={(v) => set('goal', v)}
            options={(Object.keys(GOAL_MODES) as GoalMode[]).map((k) => ({
              value: k,
              label: GOAL_MODES[k].label,
              hint: GOAL_MODES[k].hint,
            }))}
          />
          {targets ? <TargetSummary targets={targets} /> : null}
        </View>
      ) : null}

      {name === 'ai' ? (
        <View style={styles.section}>
          <Text variant="body" muted>
            Optional. Add a Google AI (Gemini) key to let AI read your old weight history from screenshots, and soon
            estimate meals from photos. You can skip this and add it later in Settings.
          </Text>
          <AiKeyCard title="Google AI key (optional)" />
        </View>
      ) : null}

      {name === 'history' ? (
        <View style={styles.section}>
          <Text variant="body" muted>
            Coming from another app like Lose It! or MyFitnessPal? Bring your weight history with you so your chart,
            trend and goal projection start with everything you’ve already logged.
          </Text>
          <Card>
            <History size={22} strokeWidth={1.8} color={colors.text} />
            <Text variant="bodyStrong">Import from screenshots</Text>
            <Text variant="label" muted>
              Screenshot the weight list in your old app, then pick the screenshots. AI reads the dates and weights,
              and you check them before anything is saved. It uses the Google AI key from the last step (if you
              skipped it, you can add one on the next screen).
            </Text>
            <Button label="Import my weight history" loading={saving} onPress={() => finish(true)} />
          </Card>
          <Text variant="label" muted>
            You can also do this later from the Weight tab.
          </Text>
        </View>
      ) : null}

      {name === 'steps' ? (
        <View style={styles.section}>
          <Text variant="body" muted>
            Set a daily step target. You can change it any time in Settings.
          </Text>
          <Card>
            <StepTargetSlider value={d.stepTarget} onChange={(v) => set('stepTarget', v)} />
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const TITLES: Record<(typeof STEPS)[number], string> = {
  welcome: 'Welcome',
  about: 'About you',
  weight: 'Your weight',
  activity: 'How active are you?',
  goal: 'Your goal',
  steps: 'Daily steps',
  ai: 'AI features',
  history: 'Your weight history',
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space[3] },
  footer: { flexDirection: 'row', gap: space[2] },
  progress: { flexDirection: 'row', gap: space[1], marginBottom: space[2] },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
});
