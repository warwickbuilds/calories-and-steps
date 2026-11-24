import { useEffect, useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Segmented, Text } from '@/components/ui';
import { AI_PROVIDERS, AiError, requestJson, type AiProvider } from '@/lib/ai/providers';
import { loadAiSettings, saveAiSettings } from '@/lib/ai/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { MAX_FONT_SCALE, layout, radius, space, type as typeScale } from '@/theme/tokens';

const PROVIDERS = (Object.keys(AI_PROVIDERS) as AiProvider[]).map((p) => ({ value: p, label: AI_PROVIDERS[p].label }));

/**
 * Pick an AI provider and paste your own API key. Used in Settings and on
 * the import screen when no key is saved yet.
 */
export function AiKeyCard({ onSaved }: { onSaved?: () => void }) {
  const { colors } = useTheme();
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [key, setKey] = useState('');
  const [model, setModel] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = (p?: AiProvider) =>
    loadAiSettings(p).then((s) => {
      setProvider(s.provider);
      setKey(s.apiKey ?? '');
      setSavedKey(s.apiKey);
      setModel(s.modelOverride ?? '');
      setMessage(null);
    });

  useEffect(() => {
    load();
  }, []);

  const info = AI_PROVIDERS[provider];

  const save = async () => {
    setBusy('save');
    try {
      await saveAiSettings({ provider, apiKey: key, modelOverride: model });
      setSavedKey(key.trim() || null);
      setMessage({ text: key.trim() ? 'Saved.' : 'Key removed.' });
      if (key.trim()) onSaved?.();
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    setMessage(null);
    try {
      await requestJson(provider, model.trim() || info.defaultModel, key.trim(), {
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
      setMessage({ text: `${info.label} answered. The key works.` });
    } catch (e) {
      setMessage({ text: e instanceof AiError ? e.message : 'Something went wrong.', error: true });
    } finally {
      setBusy(null);
    }
  };

  const inputStyle = [
    styles.input,
    typeScale.body,
    { color: colors.text, backgroundColor: colors.bg, borderColor: colors.line },
  ];

  return (
    <Card title="AI provider">
      <Text variant="label" muted>
        AI features use your own API key, so you pay the provider directly and nothing goes through anyone else.
        The key is stored encrypted on this phone.
      </Text>
      <Segmented value={provider} onChange={(p) => load(p)} options={PROVIDERS} />
      <View style={styles.field}>
        <Text variant="label" muted>
          {info.label} API key
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
          accessibilityLabel={`${info.label} API key`}
          style={inputStyle}
        />
      </View>
      {showModel ? (
        <View style={styles.field}>
          <Text variant="label" muted>
            Model (leave blank for {info.defaultModel})
          </Text>
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder={info.defaultModel}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            accessibilityLabel="Model name"
            style={inputStyle}
          />
        </View>
      ) : null}
      {provider === 'gemini' ? (
        <Text variant="caption" muted>
          With a free Gemini key, Google may use what you send (such as screenshots and meal photos) to improve its
          models, and people may review it. A paid key (billing turned on) avoids this.
        </Text>
      ) : null}
      {message ? (
        <Text variant="label" color={message.error ? colors.danger : undefined} muted={!message.error}>
          {message.text}
        </Text>
      ) : null}
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            label="Save"
            loading={busy === 'save'}
            disabled={busy != null || (!key.trim() && !savedKey)}
            onPress={save}
          />
        </View>
        <View style={styles.flex}>
          <Button
            variant="secondary"
            label="Test key"
            loading={busy === 'test'}
            disabled={busy != null || !key.trim()}
            onPress={test}
          />
        </View>
      </View>
      <View style={styles.row}>
        <Button variant="ghost" label={`Get a ${info.label} key`} onPress={() => Linking.openURL(info.keyUrl)} />
        <Button
          variant="ghost"
          label={showModel ? 'Hide model' : 'Change model'}
          onPress={() => setShowModel(!showModel)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[1] },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    minHeight: layout.minTap + 4,
  },
  row: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  flex: { flex: 1 },
});
