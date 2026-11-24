/**
 * The user's AI provider choice, API keys and optional model overrides.
 * Kept in expo-secure-store (Android Keystore), never in the database, so
 * keys stay out of backups.
 */

import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

import { AI_PROVIDERS, type AiProvider } from './providers';

const PROVIDER_KEY = 'ai.provider';
const keyFor = (p: AiProvider) => `ai.key.${p}`;
const modelFor = (p: AiProvider) => `ai.model.${p}`;

export type AiSettings = {
  provider: AiProvider;
  /** The key for the chosen provider, or null if none is saved. */
  apiKey: string | null;
  /** The model to use: the user's override, or the provider default. */
  model: string;
  modelOverride: string | null;
};

const isProvider = (v: string | null): v is AiProvider => v != null && v in AI_PROVIDERS;

export async function loadAiSettings(providerOverride?: AiProvider): Promise<AiSettings> {
  const stored = await SecureStore.getItemAsync(PROVIDER_KEY);
  const provider = providerOverride ?? (isProvider(stored) ? stored : 'gemini');
  const [apiKey, modelOverride] = await Promise.all([
    SecureStore.getItemAsync(keyFor(provider)),
    SecureStore.getItemAsync(modelFor(provider)),
  ]);
  return {
    provider,
    apiKey: apiKey || null,
    modelOverride: modelOverride || null,
    model: modelOverride || AI_PROVIDERS[provider].defaultModel,
  };
}

export async function saveAiSettings(input: {
  provider: AiProvider;
  apiKey: string | null;
  modelOverride: string | null;
}) {
  await SecureStore.setItemAsync(PROVIDER_KEY, input.provider);
  const key = input.apiKey?.trim();
  if (key) await SecureStore.setItemAsync(keyFor(input.provider), key);
  else await SecureStore.deleteItemAsync(keyFor(input.provider));
  const model = input.modelOverride?.trim();
  if (model) await SecureStore.setItemAsync(modelFor(input.provider), model);
  else await SecureStore.deleteItemAsync(modelFor(input.provider));
  notify();
}

// Tiny change signal so every screen using the hook sees a saved key.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function useAiSettings() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const reload = useCallback(() => {
    loadAiSettings().then(setSettings, () => setSettings(null));
  }, []);
  useEffect(() => {
    reload();
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);
  return settings;
}
