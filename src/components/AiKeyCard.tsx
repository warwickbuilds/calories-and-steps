import { useEffect, useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { AI_PROVIDERS, AiError, requestJson } from '@/lib/ai/providers';
import { loadAiSettings, saveAiSettings } from '@/lib/ai/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

// Kept simple for now: Google Gemini only. The adapter also supports OpenAI
// and Claude, and a model override; their settings come back in a later update.
const PROVIDER = 'gemini' as const;
const info = AI_PROVIDERS[PROVIDER];

/** Sends a tiny request to check the key works. */
async function testKey(apiKey: string, model: string) {
  await requestJson(PROVIDER, model, apiKey, {
    prompt: 'Reply with {"ok": true}.',
    images: [],
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['ok'],
      properties: { ok: { type: 'boolean' } },
    },
    schemaName: 'key_test',
    maxOutputTokens: 1000,
  });
}

/**
 * Paste your own Google AI (Gemini) API key. Used in onboarding, Settings
 * and on the import screen when no key is saved yet.
 */
export function AiKeyCard({
  title = 'Google AI key',
  onSaved,
  showModelOverride = false,
}: {
  title?: string;
  onSaved?: () => void;
  showModelOverride?: boolean;
}) {
  const { colors } = useTheme();
  const [key, setKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [modelOverride, setModelOverride] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    loadAiSettings(PROVIDER).then((s) => {
      setKey(s.apiKey ?? '');
      setSavedKey(s.apiKey);
      setModelOverride(s.modelOverride ?? '');
      if (s.modelOverride) setShowAdvanced(true);
    });
  }, []);

  const saveAndTest = async () => {
    const trimmed = key.trim();
    const override = modelOverride.trim() || null;
    const effectiveModel = override ?? info.defaultModel;
    setBusy(true);
    setMessage(null);
    try {
      await saveAiSettings({ provider: PROVIDER, apiKey: trimmed, modelOverride: override });
      setSavedKey(trimmed);
      onSaved?.();
      await testKey(trimmed, effectiveModel);
      setMessage({ text: 'Saved. The key works.' });
    } catch (e) {
      setMessage({
        text: `Saved, but the test failed: ${e instanceof AiError ? e.message : 'something went wrong.'}`,
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await saveAiSettings({ provider: PROVIDER, apiKey: null, modelOverride: null });
    setKey('');
    setSavedKey(null);
    setModelOverride('');
    setMessage({ text: 'Key removed.' });
  };

  return (
    <Card title={title}>
      <Text variant="label" muted>
        AI features (meal estimates, nutrition labels and weight screenshots) use your own Google AI key, so you pay
        Google directly. The key is stored encrypted on this phone.
      </Text>
      <TextInput
        value={key}
        onChangeText={setKey}
        placeholder={info.keyHint}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        accessibilityLabel="Google AI API key"
        style={[
          styles.input,
          typeScale.body,
          { color: colors.text, backgroundColor: colors.bg, borderColor: colors.line },
        ]}
      />
      <Text variant="caption" muted>
        With a free key, Google may use what you send (such as meal photos and screenshots) to improve its models, and
        people may review it. A paid key (billing turned on) avoids this.
      </Text>
      {showModelOverride ? (
        <View style={styles.advanced}>
          <Button
            variant="ghost"
            label={showAdvanced ? 'Hide model override' : 'Model override'}
            onPress={() => setShowAdvanced((v) => !v)}
          />
          {showAdvanced ? (
            <View style={styles.field}>
              <Text variant="label" muted>
                Model name (leave empty for default: {info.defaultModel})
              </Text>
              <TextInput
                value={modelOverride}
                onChangeText={setModelOverride}
                placeholder={info.defaultModel}
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                accessibilityLabel="Model override"
                style={[
                  styles.input,
                  typeScale.body,
                  { color: colors.text, backgroundColor: colors.bg, borderColor: colors.line },
                ]}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      {message ? (
        <Text variant="label" color={message.error ? colors.danger : undefined} muted={!message.error}>
          {message.text}
        </Text>
      ) : null}
      <Button label="Save and test" loading={busy} disabled={busy || !key.trim()} onPress={saveAndTest} />
      <View style={styles.row}>
        <Button variant="ghost" label="Get a key" onPress={() => Linking.openURL(info.keyUrl)} />
        {savedKey ? <Button variant="ghost" label="Remove key" onPress={remove} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    minHeight: layout.minTap + 4,
  },
  advanced: { gap: space[2] },
  field: { gap: space[1] },
  row: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
});
