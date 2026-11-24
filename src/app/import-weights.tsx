import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Check, ImagePlus } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AiKeyCard } from '@/components/AiKeyCard';
import { Button, Card, Screen, Text } from '@/components/ui';
import { allWeightsQuery, importWeights } from '@/db/queries';
import { useProfile } from '@/hooks/data';
import { prepareImage } from '@/lib/ai/prepareImage';
import { AI_PROVIDERS, AiError, requestJson } from '@/lib/ai/providers';
import { useAiSettings } from '@/lib/ai/settings';
import { weightScreenshotRequest } from '@/lib/ai/weightScreenshot';
import { fromLocalDateString } from '@/lib/dates';
import { fromDisplayWeight, parseDecimal, toDisplayWeight, weightUnitLabel, type UnitSystem } from '@/lib/units';
import {
  MAX_KG,
  MIN_KG,
  compareWithExisting,
  mergeRows,
  normaliseRows,
  type ParsedRow,
  type ReviewRow,
} from '@/lib/weightImport';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

const MAX_SCREENSHOTS = 30;

type Phase =
  | { kind: 'pick' }
  | { kind: 'reading'; done: number; total: number }
  | { kind: 'review' }
  | { kind: 'saved'; added: number; replaced: number };

/** What the user changed on a row, kept by date so it survives adding more screenshots. */
type Override = { selected?: boolean; kg?: number };

export default function ImportWeightsScreen() {
  const ai = useAiSettings();
  const { profile } = useProfile();
  const units = profile?.unitPref ?? 'metric';
  const { data: existing = [] } = useLiveQuery(allWeightsQuery());

  const [phase, setPhase] = useState<Phase>({ kind: 'pick' });
  const [shots, setShots] = useState<ParsedRow[][]>([]);
  const [dropped, setDropped] = useState(0);
  const [failures, setFailures] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [saving, setSaving] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const rows: ReviewRow[] = useMemo(
    () =>
      compareWithExisting(mergeRows(shots), existing).map((r) => {
        const o = overrides[r.day];
        return { ...r, kg: o?.kg ?? r.kg, selected: o?.selected ?? r.selected };
      }),
    [shots, existing, overrides],
  );
  const reviewable = rows.filter((r) => r.status !== 'same');
  const sameCount = rows.length - reviewable.length;
  const chosen = reviewable.filter((r) => r.selected);

  const pickAndRead = async () => {
    if (!ai?.apiKey) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_SCREENSHOTS,
      orderedSelection: true,
      quality: 1,
    });
    if (picked.canceled || picked.assets.length === 0) return;

    const assets = picked.assets.slice(0, MAX_SCREENSHOTS);
    const controller = new AbortController();
    abort.current = controller;
    const offset = shots.length;
    const newShots: ParsedRow[][] = [];
    const newFailures: string[] = [];
    let newDropped = 0;
    setPhase({ kind: 'reading', done: 0, total: assets.length });

    // One at a time keeps us well inside free-tier rate limits and shows steady progress.
    for (let i = 0; i < assets.length; i++) {
      if (controller.signal.aborted) break;
      const label = `Screenshot ${offset + i + 1}`;
      try {
        const image = await prepareImage(assets[i].uri, assets[i].width);
        const answer = await requestJson(ai.provider, ai.model, ai.apiKey, weightScreenshotRequest(image), controller.signal);
        const { rows: parsed, dropped: d } = normaliseRows(answer);
        newShots.push(parsed);
        newDropped += d;
        if (parsed.length === 0) newFailures.push(`${label}: no weights found.`);
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') break;
        newFailures.push(`${label}: ${e instanceof AiError ? e.message : 'couldn’t be read.'}`);
        // A bad key or spending limit will fail every screenshot, so stop early.
        if (e instanceof AiError && (e.kind === 'auth' || e.kind === 'rate-limit')) break;
      }
      setPhase({ kind: 'reading', done: i + 1, total: assets.length });
    }
    abort.current = null;
    setShots((s) => [...s, ...newShots]);
    setDropped((d) => d + newDropped);
    setFailures((f) => [...f, ...newFailures]);
    setPhase({ kind: 'review' });
  };

  const setRow = (day: string, o: Override) => setOverrides((all) => ({ ...all, [day]: { ...all[day], ...o } }));

  const selectAll = (selected: boolean) =>
    setOverrides((all) => {
      const next = { ...all };
      for (const r of reviewable) next[r.day] = { ...next[r.day], selected };
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const result = await importWeights(
        chosen.map((r) => ({ day: r.day, kg: r.kg, existingId: r.status === 'different' ? r.existingId : null })),
      );
      setPhase({ kind: 'saved', ...result });
    } finally {
      setSaving(false);
    }
  };

  if (!ai) return null;
  const provider = AI_PROVIDERS[ai.provider];

  if (phase.kind === 'saved') {
    return (
      <Screen edges={['bottom']}>
        <Card>
          <Text variant="metric">
            {phase.added + phase.replaced} {phase.added + phase.replaced === 1 ? 'weight' : 'weights'} imported
          </Text>
          <Text variant="label" muted>
            {phase.added} added{phase.replaced > 0 ? `, ${phase.replaced} replaced` : ''}. Your chart, trend and goal
            projection now include them.
          </Text>
          <Button label="Done" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  if (phase.kind === 'reading') {
    return (
      <Screen edges={['bottom']}>
        <Card>
          <Text variant="title">
            Reading screenshot {Math.min(phase.done + 1, phase.total)} of {phase.total}
          </Text>
          <Text variant="label" muted>
            {provider.label} is reading the dates and weights. This takes a few seconds per screenshot.
          </Text>
          <Button loading label="Reading" onPress={() => {}} />
          <Button variant="ghost" label="Stop" onPress={() => abort.current?.abort()} />
        </Card>
      </Screen>
    );
  }

  if (phase.kind === 'pick') {
    return (
      <Screen edges={['bottom']}>
        <Card title="Import from screenshots">
          <Text variant="body">
            Coming from another app that can’t export? Take screenshots of its weight history list (scroll and
            screenshot until you reach your first entry), then choose them here.
          </Text>
          <Text variant="label" muted>
            Works with Lose It!, MyFitnessPal, smart-scale apps and anything else that shows a date next to each
            weight, in kg or lb. Overlapping screenshots are fine; duplicates are removed. If a screenshot only has a
            chart, the main points are estimated from it. You check everything before it’s saved.
          </Text>
        </Card>
        {ai.apiKey ? (
          <>
            <Button label={`Choose screenshots (up to ${MAX_SCREENSHOTS})`} onPress={pickAndRead} />
            <Text variant="caption" muted>
              The screenshots are sent to {provider.company} {provider.label} with your API key and aren’t kept by
              this app. You can change the key in Settings.
            </Text>
          </>
        ) : (
          <AiKeyCard />
        )}
      </Screen>
    );
  }

  // Review
  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          label={chosen.length === 0 ? 'Nothing selected' : `Import ${chosen.length} ${chosen.length === 1 ? 'weight' : 'weights'}`}
          disabled={chosen.length === 0}
          loading={saving}
          onPress={save}
        />
      }>
      <Card>
        <Text variant="title">
          {rows.length === 0 ? 'No weights found' : `${rows.length} ${rows.length === 1 ? 'date' : 'dates'} found`}
        </Text>
        <Text variant="label" muted>
          {summaryLine(reviewable.length, sameCount)}
        </Text>
        {dropped > 0 ? (
          <Text variant="label" muted>
            {dropped} {dropped === 1 ? 'row was' : 'rows were'} skipped because the date or weight didn’t make sense.
          </Text>
        ) : null}
        {failures.map((f) => (
          <Text key={f} variant="label" muted>
            {f}
          </Text>
        ))}
        <View style={styles.actions}>
          <Button variant="secondary" icon={ImagePlus} accessibilityLabel="Add more screenshots" onPress={pickAndRead} />
          {reviewable.length > 0 ? (
            <Button
              variant="ghost"
              label={chosen.length === reviewable.length ? 'Select none' : 'Select all'}
              onPress={() => selectAll(chosen.length !== reviewable.length)}
            />
          ) : null}
        </View>
      </Card>

      {reviewable.length > 0 ? (
        <Card>
          {reviewable.map((r) => (
            <ReviewLine key={r.day} row={r} units={units} onChange={(o) => setRow(r.day, o)} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function summaryLine(toReview: number, same: number): string {
  const parts: string[] = [];
  if (toReview > 0) parts.push('Untick anything that looks wrong, or tap a weight to fix it.');
  if (same > 0) parts.push(`${same} ${same === 1 ? 'is' : 'are'} already in the app with the same weight and will be left alone.`);
  if (parts.length === 0) parts.push('Try clearer screenshots of the list of entries.');
  return parts.join(' ');
}

function ReviewLine({ row, units, onChange }: { row: ReviewRow; units: UnitSystem; onChange: (o: Override) => void }) {
  const { colors } = useTheme();
  const shown = toDisplayWeight(row.kg, units).toFixed(1);
  const [text, setText] = useState<string | null>(null);
  const unit = weightUnitLabel(units);

  const commit = () => {
    if (text == null) return;
    const v = parseDecimal(text);
    const kg = v == null ? null : fromDisplayWeight(v, units);
    if (kg != null && kg >= MIN_KG && kg <= MAX_KG) onChange({ kg: Math.round(kg * 100) / 100, selected: true });
    setText(null);
  };

  const notes: string[] = [];
  if (row.status === 'different' && row.existingKg != null) {
    notes.push(`In the app: ${toDisplayWeight(row.existingKg, units).toFixed(1)} ${unit}. Tick to replace it.`);
  }
  if (row.source === 'chart') notes.push('Estimated from the chart');
  if (row.yearGuessed) notes.push('Year not shown, so it was guessed');
  if (row.otherReadings.length > 0) {
    notes.push(`Also read as ${row.otherReadings.map((kg) => toDisplayWeight(kg, units).toFixed(1)).join(', ')}`);
  }

  return (
    <View style={[styles.line, { borderTopColor: colors.line }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: row.selected }}
        accessibilityLabel={`Import ${formatDay(row.day)}`}
        onPress={() => onChange({ selected: !row.selected })}
        style={styles.check}>
        <View
          style={[
            styles.box,
            { borderColor: row.selected ? colors.primary : colors.muted },
            row.selected && { backgroundColor: colors.primary },
          ]}>
          {row.selected ? <Check size={16} strokeWidth={3} color={colors.onPrimary} /> : null}
        </View>
      </Pressable>
      <View style={styles.lineText}>
        <Text variant="bodyMedium" muted={!row.selected}>
          {formatDay(row.day)}
        </Text>
        {notes.map((n) => (
          <Text key={n} variant="caption" muted>
            {n}
          </Text>
        ))}
      </View>
      <View style={[styles.weight, { borderColor: colors.line }]}>
        <TextInput
          value={text ?? shown}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          selectTextOnFocus
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel={`Weight for ${formatDay(row.day)}`}
          style={[styles.weightInput, typeScale.bodyStrong, { color: row.selected ? colors.text : colors.muted }]}
        />
        <Text variant="caption" muted>
          {unit}
        </Text>
      </View>
    </View>
  );
}

const formatDay = (day: string) =>
  fromLocalDateString(day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingTop: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  check: { width: layout.minTap, height: layout.minTap, alignItems: 'center', justifyContent: 'center' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineText: { flex: 1, gap: 2 },
  weight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    minHeight: layout.minTap - 4,
  },
  weightInput: { minWidth: 48, textAlign: 'right', paddingVertical: 0 },
});
