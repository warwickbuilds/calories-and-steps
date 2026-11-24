/**
 * Backup export and restore (format in src/lib/backup.ts).
 *
 * Export reads every table, streams a zip into the cache folder (photos one
 * at a time, so memory stays small), then hands it to the share sheet or
 * writes it into a folder the user picks.
 *
 * Restore is two steps so the user can confirm first: readBackup() unpacks
 * the zip into a staging folder and checks it without touching anything;
 * applyBackup() then replaces every table in one transaction and renames
 * the staged photos folder into place. If the database step fails nothing is changed.
 */

import Constants from 'expo-constants';
import { Directory, File, FileMode, Paths, type FileHandle } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Unzip, UnzipInflate, Zip, ZipDeflate, ZipPassThrough, strFromU8, strToU8 } from 'fflate';

import migrations from '../../drizzle/migrations';
import {
  BACKUP_TABLES,
  BackupError,
  DATA_NAME,
  MANIFEST_NAME,
  backupFileName,
  checkBackup,
  isPhotoEntry,
  makeManifest,
  type BackupManifest,
  type BackupRows,
  type BackupTable,
} from '@/lib/backup';

import { db } from './client';
import { bodyCheck, bodyPhoto, foodItem, foodRef, meal, profile, stepsDay, weightEntry } from './schema';

const TABLES = { profile, foodRef, meal, foodItem, weightEntry, bodyCheck, bodyPhoto, stepsDay } as const;
const PHOTO_DIR = 'photos';
/** Restored photos are unpacked here, next to photos/, then renamed into place. */
const STAGING_DIR = 'photos-incoming';
const OLD_DIR = 'photos-old';
const INSERT_CHUNK = 50;
const STREAM_CHUNK = 1024 * 1024;

/** Number of migrations this build applies; a backup from a later schema is refused. */
export const SCHEMA_VERSION = migrations.journal.entries.length;

const appVersion = () => Constants.expoConfig?.version ?? null;

async function copyFileStreaming(src: File, dest: File): Promise<void> {
  const reader = src.open(FileMode.ReadOnly);
  const writer = dest.open(FileMode.WriteOnly);
  try {
    while (true) {
      const chunk = await reader.readBytes(STREAM_CHUNK);
      if (chunk.length === 0) break;
      await writer.writeBytes(chunk);
    }
  } finally {
    reader.close();
    writer.close();
  }
}

async function readAllRows(): Promise<BackupRows> {
  const rows = {} as BackupRows;
  for (const t of BACKUP_TABLES) {
    rows[t] = (await db.select().from(TABLES[t])) as Record<string, unknown>[];
  }
  return rows;
}

function photoFiles(): File[] {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  if (!dir.exists) return [];
  return dir.list().filter((f): f is File => f instanceof File && isPhotoEntry(`${PHOTO_DIR}/${f.name}`));
}

/** Writes the backup zip into the cache folder and returns it. */
export async function writeBackupFile(): Promise<{ file: File; manifest: BackupManifest }> {
  const rows = await readAllRows();
  const photos = photoFiles();
  const manifest = makeManifest({ rows, photoCount: photos.length, appVersion: appVersion(), schemaVersion: SCHEMA_VERSION });

  const dir = new Directory(Paths.cache, 'backup');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const file = new File(dir, backupFileName());
  file.create({ overwrite: true });
  const handle = file.open();
  let failed: Error | null = null;

  try {
    const zip = new Zip((err, chunk) => {
      if (err) failed = err;
      else if (!failed) handle.writeBytesSync(chunk);
    });
    const addText = (name: string, text: string) => {
      const entry = new ZipDeflate(name, { level: 6 });
      zip.add(entry);
      entry.push(strToU8(text), true);
    };
    addText(MANIFEST_NAME, JSON.stringify(manifest, null, 2));
    addText(DATA_NAME, JSON.stringify(rows));
    // JPEGs are already compressed, so they are stored as they are.
    for (const photo of photos) {
      const entry = new ZipPassThrough(`${PHOTO_DIR}/${photo.name}`);
      zip.add(entry);
      entry.push(await photo.bytes(), true);
    }
    zip.end();
  } finally {
    handle.close();
  }
  if (failed) throw failed;
  return { file, manifest };
}

/** Opens the share sheet (Drive, Files, email…) with a fresh backup. */
export async function shareBackup(): Promise<BackupManifest> {
  const { file, manifest } = await writeBackupFile();
  await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', dialogTitle: 'Save your backup' });
  return manifest;
}

/** Asks for a folder (for example Downloads) and saves a fresh backup there. Returns null if cancelled. */
export async function saveBackupToFolder(): Promise<BackupManifest | null> {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch {
    return null; // The picker throws when it is closed without choosing.
  }
  if (!folder) return null;
  const { file, manifest } = await writeBackupFile();
  const target = folder.createFile(file.name, 'application/zip');
  await copyFileStreaming(file, target);
  return manifest;
}

export interface StagedBackup {
  manifest: BackupManifest;
  rows: BackupRows;
}

function stagingDir(): Directory {
  return new Directory(Paths.document, STAGING_DIR);
}

/** Removes a staged restore the user didn't go ahead with. */
export function discardStagedBackup() {
  try {
    const dir = stagingDir();
    if (dir.exists) dir.delete();
  } catch {
    // Only leftover files; the next restore clears them.
  }
}

/** Lets the user pick a backup file, unpacks it to a staging folder and checks it. Returns null if cancelled. */
export async function readBackup(): Promise<StagedBackup | null> {
  const picked = await File.pickFileAsync({
    mimeTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  });
  if (picked.canceled || !picked.result) return null;

  discardStagedBackup();
  const photoDir = stagingDir();
  photoDir.create({ intermediates: true });

  const texts: Record<string, string> = {};
  const openHandles = new Set<FileHandle>();
  let failed: Error | null = null;

  const closeHandle = (h: FileHandle | null) => {
    if (!h || !openHandles.has(h)) return;
    openHandles.delete(h);
    try {
      h.close();
    } catch {
      // Closing during error cleanup.
    }
  };

  const unzip = new Unzip((entry) => {
    const isText = entry.name === MANIFEST_NAME || entry.name === DATA_NAME;
    if (!isText && !isPhotoEntry(entry.name)) return; // Anything else in the zip is ignored.

    if (isText) {
      const chunks: Uint8Array[] = [];
      entry.ondata = (err, chunk, final) => {
        if (err) {
          failed = err;
          return;
        }
        chunks.push(chunk);
        if (final) texts[entry.name] = strFromU8(concat(chunks));
      };
      entry.start();
      return;
    }

    let outHandle: FileHandle | null = null;
    try {
      const out = new File(photoDir, entry.name.slice(PHOTO_DIR.length + 1));
      out.create({ overwrite: true });
      outHandle = out.open(FileMode.WriteOnly);
      openHandles.add(outHandle);
    } catch (e) {
      failed = e instanceof Error ? e : new Error(String(e));
      return;
    }

    entry.ondata = (err, chunk, final) => {
      if (err) {
        failed = err;
        closeHandle(outHandle);
        return;
      }
      try {
        if (chunk.length > 0 && outHandle) outHandle.writeBytesSync(chunk);
      } catch (e) {
        failed = e instanceof Error ? e : new Error(String(e));
        closeHandle(outHandle);
        return;
      }
      if (final) closeHandle(outHandle);
    };
    entry.start();
  });
  unzip.register(UnzipInflate);

  let reader: FileHandle | null = null;
  try {
    try {
      reader = picked.result.open(FileMode.ReadOnly);
      while (true) {
        const chunk = await reader.readBytes(STREAM_CHUNK);
        if (chunk.length === 0) break;
        unzip.push(chunk, false);
        if (failed) throw failed;
      }
      unzip.push(new Uint8Array(0), true);
      if (failed) throw failed;
    } finally {
      if (reader) {
        try {
          reader.close();
        } catch {
          // Ignore close error on cleanup.
        }
      }
      for (const h of [...openHandles]) closeHandle(h);
    }
  } catch (e) {
    discardStagedBackup();
    if (e instanceof BackupError) throw e;
    throw new BackupError('The backup file is damaged and can’t be read.');
  }

  try {
    return checkBackup(texts[MANIFEST_NAME] ?? null, texts[DATA_NAME] ?? null, SCHEMA_VERSION);
  } catch (e) {
    discardStagedBackup();
    throw e;
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Replaces everything on the phone with a staged backup. */
export async function applyBackup(staged: StagedBackup): Promise<void> {
  await db.transaction(async (tx) => {
    for (const t of [...BACKUP_TABLES].reverse()) {
      await tx.delete(TABLES[t]);
    }
    for (const t of BACKUP_TABLES) {
      const list = staged.rows[t];
      for (let i = 0; i < list.length; i += INSERT_CHUNK) {
        // Rows come back in the same shape the app reads them; columns a
        // backup doesn't have (from an older version) take their defaults.
        await tx.insert(TABLES[t] as (typeof TABLES)[BackupTable]).values(list.slice(i, i + INSERT_CHUNK) as never);
      }
    }
  });

  // Swap the photos folder: the old one is kept until the new one is in place.
  const old = new Directory(Paths.document, OLD_DIR);
  try {
    if (old.exists) old.delete();
    const current = new Directory(Paths.document, PHOTO_DIR);
    const hadPhotos = current.exists;
    if (hadPhotos) current.rename(OLD_DIR);
    try {
      stagingDir().rename(PHOTO_DIR);
    } catch (e) {
      if (hadPhotos) old.rename(PHOTO_DIR);
      throw e;
    }
    if (old.exists) old.delete();
  } finally {
    discardStagedBackup();
  }
}
