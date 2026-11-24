/**
 * Backup file format and the pure checks around it. The file is a zip:
 *
 *   manifest.json   what is inside (format, app version, schema version, counts)
 *   data.json       every row of every table, as the app reads them
 *   photos/*.jpg    progress photos and their thumbnails
 *
 * The reading and writing lives in src/db/backup.ts; this file has no
 * native imports so it can be unit tested.
 */

import { toLocalDateString } from './dates';

export const BACKUP_FORMAT = 1;
export const BACKUP_APP = 'calories-and-steps';
export const MANIFEST_NAME = 'manifest.json';
export const DATA_NAME = 'data.json';

/** Tables in insert order (parents before children). Deleting goes in reverse. */
export const BACKUP_TABLES = [
  'profile',
  'foodRef',
  'meal',
  'foodItem',
  'weightEntry',
  'bodyCheck',
  'bodyPhoto',
  'stepsDay',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export type BackupRows = Record<BackupTable, Record<string, unknown>[]>;

export interface BackupManifest {
  format: number;
  app: string;
  appVersion: string | null;
  /** Number of database migrations applied when the backup was made. */
  schemaVersion: number;
  exportedAt: string;
  counts: Record<BackupTable, number>;
  photoCount: number;
}

export function makeManifest(input: {
  rows: BackupRows;
  photoCount: number;
  appVersion: string | null;
  schemaVersion: number;
  now?: Date;
}): BackupManifest {
  const counts = {} as Record<BackupTable, number>;
  for (const t of BACKUP_TABLES) counts[t] = input.rows[t].length;
  return {
    format: BACKUP_FORMAT,
    app: BACKUP_APP,
    appVersion: input.appVersion,
    schemaVersion: input.schemaVersion,
    exportedAt: (input.now ?? new Date()).toISOString(),
    counts,
    photoCount: input.photoCount,
  };
}

export function backupFileName(now: Date = new Date()): string {
  return `calories-and-steps-backup-${toLocalDateString(now)}.zip`;
}

/**
 * Only plain photo files are restored, so a crafted zip can't write
 * anywhere else ("../" paths and the like).
 */
export function isPhotoEntry(name: string): boolean {
  return /^photos\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.jpg$/.test(name) && !name.includes('..');
}

export class BackupError extends Error {}

/** Checks the manifest and data before anything on the phone is touched. Throws BackupError with a plain message. */
export function checkBackup(
  manifestText: string | null,
  dataText: string | null,
  currentSchemaVersion: number,
): { manifest: BackupManifest; rows: BackupRows } {
  if (manifestText == null || dataText == null) {
    throw new BackupError('This file isn’t a Calories and Steps backup.');
  }
  let manifest: BackupManifest;
  let data: unknown;
  try {
    manifest = JSON.parse(manifestText) as BackupManifest;
    data = JSON.parse(dataText);
  } catch {
    throw new BackupError('The backup file is damaged and can’t be read.');
  }
  if (manifest?.app !== BACKUP_APP || typeof manifest.format !== 'number') {
    throw new BackupError('This file isn’t a Calories and Steps backup.');
  }
  if (manifest.format > BACKUP_FORMAT || manifest.schemaVersion > currentSchemaVersion) {
    throw new BackupError(
      `This backup was made by a newer version of the app${manifest.appVersion ? ` (${manifest.appVersion})` : ''}. Update the app, then restore it.`,
    );
  }
  if (!data || typeof data !== 'object') {
    throw new BackupError('The backup file is damaged and can’t be read.');
  }
  const rows = {} as BackupRows;
  for (const t of BACKUP_TABLES) {
    const list = (data as Record<string, unknown>)[t] ?? [];
    if (!Array.isArray(list) || list.some((r) => !r || typeof r !== 'object')) {
      throw new BackupError('The backup file is damaged and can’t be read.');
    }
    rows[t] = list as Record<string, unknown>[];
  }
  if (rows.profile.length !== 1) {
    throw new BackupError('The backup has no profile, so it can’t be restored.');
  }
  return { manifest, rows };
}

/** One line for the restore confirmation, e.g. "212 foods logged, 45 weigh-ins, 6 check-ins and 18 photos". */
export function describeBackup(m: BackupManifest): string {
  const parts: string[] = [];
  const add = (n: number, one: string, many: string) => {
    if (n > 0) parts.push(`${n.toLocaleString()} ${n === 1 ? one : many}`);
  };
  add(m.counts.foodItem ?? 0, 'food logged', 'foods logged');
  add(m.counts.weightEntry ?? 0, 'weigh-in', 'weigh-ins');
  add(m.counts.bodyCheck ?? 0, 'check-in', 'check-ins');
  // Prefer the exact DB photo row count, falling back to half the files (full + thumb).
  const photos = (m.counts.bodyPhoto ?? 0) > 0 ? m.counts.bodyPhoto : Math.round((m.photoCount ?? 0) / 2);
  add(photos, 'photo', 'photos');
  if (parts.length === 0) return 'your settings only';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const BACKUP_REMINDER_DAYS = 14;
export const BACKUP_SNOOZE_DAYS = 3;

/**
 * Whether Today should suggest a backup: 14 days after the last one (or
 * after setting up, if there has never been one), unless snoozed.
 */
export function backupDue(input: {
  lastBackupAt: string | null | undefined;
  setUpAt: string | null | undefined;
  snoozedUntil: string | null | undefined;
  now?: Date;
}): boolean {
  const now = (input.now ?? new Date()).getTime();
  if (input.snoozedUntil && Date.parse(input.snoozedUntil) > now) return false;
  const since = input.lastBackupAt ?? input.setUpAt;
  if (!since) return false;
  const t = Date.parse(since);
  if (Number.isNaN(t)) return false;
  return now - t >= BACKUP_REMINDER_DAYS * DAY_MS;
}

export function snoozeUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + BACKUP_SNOOZE_DAYS * DAY_MS).toISOString();
}
