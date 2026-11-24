/**
 * When the last backup was made, and whether the Today reminder is snoozed.
 * Kept in a small JSON file in the document folder (like the update check),
 * so a restore doesn't overwrite it.
 */

import { File, Paths } from 'expo-file-system';
import { useCallback, useState } from 'react';

import { backupDue, snoozeUntil } from './backup';

const STATE_FILE = 'backup-state.json';

interface BackupState {
  lastBackupAt?: string;
  snoozedUntil?: string;
}

function stateFile() {
  return new File(Paths.document, STATE_FILE);
}

export function readBackupState(): BackupState {
  try {
    const f = stateFile();
    return f.exists ? (JSON.parse(f.textSync()) as BackupState) : {};
  } catch {
    return {};
  }
}

function writeBackupState(state: BackupState) {
  try {
    const f = stateFile();
    if (!f.exists) f.create();
    f.writeSync(JSON.stringify(state));
  } catch {
    // Only means the reminder may show again sooner.
  }
}

export function markBackedUp(at: Date = new Date()) {
  writeBackupState({ lastBackupAt: at.toISOString() });
}

/** For the Today reminder. `setUpAt` is when the profile was created. */
export function useBackupReminder(setUpAt: string | null | undefined) {
  const [state, setState] = useState(readBackupState);
  const due = backupDue({ lastBackupAt: state.lastBackupAt, setUpAt, snoozedUntil: state.snoozedUntil });
  const snooze = useCallback(() => {
    const next = { ...readBackupState(), snoozedUntil: snoozeUntil() };
    writeBackupState(next);
    setState(next);
  }, []);
  const refresh = useCallback(() => setState(readBackupState()), []);
  return { due, lastBackupAt: state.lastBackupAt ?? null, snooze, refresh };
}
