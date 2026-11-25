/**
 * Reminder preferences stored in a small JSON file in the document folder
 * (same pattern as backup-state.json), so no database migration is needed and
 * restoring an older backup doesn't overwrite this phone's notification setup.
 */

import { File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';

import {
  DEFAULT_REMINDERS,
  parseReminderSettings,
  type ReminderId,
  type ReminderPref,
  type ReminderSettings,
} from './reminders';

const FILE_NAME = 'reminders.json';

function stateFile() {
  return new File(Paths.document, FILE_NAME);
}

function readFromDisk(): ReminderSettings {
  try {
    const f = stateFile();
    return f.exists ? parseReminderSettings(JSON.parse(f.textSync())) : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

function writeToDisk(next: ReminderSettings) {
  try {
    const f = stateFile();
    if (!f.exists) f.create();
    f.writeSync(JSON.stringify(next));
  } catch {
    // Ignore disk write failures; in-memory state remains active for this session.
  }
}

let cached: ReminderSettings | null = null;
const listeners = new Set<() => void>();

export function getReminderSettings(): ReminderSettings {
  if (!cached) cached = readFromDisk();
  return cached;
}

export function updateReminderPref(id: ReminderId, patch: Partial<ReminderPref>): ReminderSettings {
  const current = getReminderSettings();
  const next: ReminderSettings = {
    ...current,
    [id]: { ...current[id], ...patch },
  };
  cached = next;
  writeToDisk(next);
  for (const listener of listeners) listener();
  return next;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReminderSettings(): ReminderSettings {
  return useSyncExternalStore(subscribe, getReminderSettings, () => DEFAULT_REMINDERS);
}
