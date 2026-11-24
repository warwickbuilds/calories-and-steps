import { Unzip, UnzipInflate, Zip, ZipDeflate, ZipPassThrough, strFromU8, strToU8 } from 'fflate';

import {
  BACKUP_TABLES,
  BackupError,
  backupDue,
  backupFileName,
  checkBackup,
  describeBackup,
  isPhotoEntry,
  makeManifest,
  type BackupRows,
} from '../backup';

const emptyRows = (): BackupRows =>
  Object.fromEntries(BACKUP_TABLES.map((t) => [t, []])) as unknown as BackupRows;

const rowsWith = (over: Partial<BackupRows>): BackupRows => ({ ...emptyRows(), profile: [{ id: 1 }], ...over });

const manifestText = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    ...makeManifest({ rows: rowsWith({}), photoCount: 0, appVersion: '0.14.0', schemaVersion: 5 }),
    ...over,
  });

describe('checkBackup', () => {
  it('accepts a good backup and returns its rows', () => {
    const rows = rowsWith({ weightEntry: [{ id: 1, weightKg: 80 }] });
    const out = checkBackup(manifestText(), JSON.stringify(rows), 5);
    expect(out.rows.weightEntry).toHaveLength(1);
    expect(out.manifest.appVersion).toBe('0.14.0');
  });

  it('accepts a backup from an older schema, filling missing tables with nothing', () => {
    const { stepsDay: _, ...older } = rowsWith({});
    const out = checkBackup(manifestText({ schemaVersion: 3 }), JSON.stringify(older), 5);
    expect(out.rows.stepsDay).toEqual([]);
  });

  it('refuses a backup from a newer app', () => {
    expect(() => checkBackup(manifestText({ schemaVersion: 6, appVersion: '0.20.0' }), '{}', 5)).toThrow(
      /newer version of the app \(0\.20\.0\)/,
    );
  });

  it('refuses other files and damaged ones', () => {
    expect(() => checkBackup(null, '{}', 5)).toThrow(BackupError);
    expect(() => checkBackup(JSON.stringify({ app: 'other' }), '{}', 5)).toThrow(/isn’t a Calories and Steps backup/);
    expect(() => checkBackup(manifestText(), '{not json', 5)).toThrow(/damaged/);
    expect(() => checkBackup(manifestText(), JSON.stringify({ ...rowsWith({}), meal: 'x' }), 5)).toThrow(/damaged/);
  });

  it('needs exactly one profile', () => {
    expect(() => checkBackup(manifestText(), JSON.stringify(emptyRows()), 5)).toThrow(/no profile/);
  });
});

describe('isPhotoEntry', () => {
  it('allows only plain jpg names inside photos/', () => {
    expect(isPhotoEntry('photos/check_2026-11-24T10-00-00-000Z_front.jpg')).toBe(true);
    expect(isPhotoEntry('photos/x_thumb.jpg')).toBe(true);
    expect(isPhotoEntry('photos/../data.jpg')).toBe(false);
    expect(isPhotoEntry('photos/sub/x.jpg')).toBe(false);
    expect(isPhotoEntry('../photos/x.jpg')).toBe(false);
    expect(isPhotoEntry('photos/.jpg')).toBe(false);
    expect(isPhotoEntry('photos/x.png')).toBe(false);
  });
});

describe('describeBackup', () => {
  it('lists what is inside in plain words', () => {
    const m = makeManifest({
      rows: rowsWith({ foodItem: [{}, {}], weightEntry: [{}], bodyCheck: [{}, {}, {}] }),
      photoCount: 12,
      appVersion: null,
      schemaVersion: 5,
    });
    expect(describeBackup(m)).toBe('2 foods logged, 1 weigh-in, 3 check-ins and 6 photos');
  });
  it('handles an empty backup', () => {
    const m = makeManifest({ rows: rowsWith({}), photoCount: 0, appVersion: null, schemaVersion: 5 });
    expect(describeBackup(m)).toBe('your settings only');
  });
});

describe('backupFileName', () => {
  it('uses the local date', () => {
    expect(backupFileName(new Date(2026, 10, 24, 9))).toBe('calories-and-steps-backup-2026-11-24.zip');
  });
});

describe('backupDue', () => {
  const now = new Date('2026-12-20T12:00:00Z');
  it('is due 14 days after the last backup', () => {
    expect(backupDue({ lastBackupAt: '2026-12-06T12:00:00Z', setUpAt: null, snoozedUntil: null, now })).toBe(true);
    expect(backupDue({ lastBackupAt: '2026-12-07T12:00:00Z', setUpAt: null, snoozedUntil: null, now })).toBe(false);
  });
  it('counts from setting up when there has never been a backup', () => {
    expect(backupDue({ lastBackupAt: null, setUpAt: '2026-12-01T00:00:00Z', snoozedUntil: null, now })).toBe(true);
    expect(backupDue({ lastBackupAt: null, setUpAt: '2026-12-15T00:00:00Z', snoozedUntil: null, now })).toBe(false);
    expect(backupDue({ lastBackupAt: null, setUpAt: null, snoozedUntil: null, now })).toBe(false);
  });
  it('stays quiet while snoozed', () => {
    expect(
      backupDue({ lastBackupAt: '2026-11-01T00:00:00Z', setUpAt: null, snoozedUntil: '2026-12-21T00:00:00Z', now }),
    ).toBe(false);
  });
});

// The same streaming zip calls src/db/backup.ts uses, end to end.
describe('zip round trip', () => {
  it('writes and reads back manifest, data and a photo', () => {
    const chunks: Uint8Array[] = [];
    const zip = new Zip((err, chunk) => {
      if (err) throw err;
      chunks.push(chunk);
    });
    const text = new ZipDeflate('data.json', { level: 6 });
    zip.add(text);
    text.push(strToU8('{"a":1}'), true);
    const photo = new ZipPassThrough('photos/p.jpg');
    zip.add(photo);
    photo.push(new Uint8Array([1, 2, 3]), true);
    zip.end();
    const bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let o = 0;
    for (const c of chunks) {
      bytes.set(c, o);
      o += c.length;
    }

    const out: Record<string, Uint8Array> = {};
    const unzip = new Unzip((f) => {
      const parts: Uint8Array[] = [];
      f.ondata = (err, d, final) => {
        if (err) throw err;
        parts.push(d);
        if (final) out[f.name] = parts.length === 1 ? parts[0] : new Uint8Array(parts.flatMap((p) => [...p]));
      };
      f.start();
    });
    unzip.register(UnzipInflate);
    unzip.push(bytes, true);
    expect(strFromU8(out['data.json'])).toBe('{"a":1}');
    expect([...out['photos/p.jpg']]).toEqual([1, 2, 3]);
  });
});
