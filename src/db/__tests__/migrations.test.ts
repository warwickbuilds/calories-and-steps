import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { BACKUP_TABLES } from '../../lib/backup';

const DRIZZLE_DIR = path.resolve(__dirname, '../../../drizzle');
const journal = JSON.parse(fs.readFileSync(path.join(DRIZZLE_DIR, 'meta/_journal.json'), 'utf8')) as {
  entries: { idx: number; tag: string }[];
};

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function runMigration(db: DatabaseSync, tag: string) {
  const sqlText = fs.readFileSync(path.join(DRIZZLE_DIR, `${tag}.sql`), 'utf8');
  const statements = sqlText
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);
  db.exec('BEGIN');
  try {
    for (const stmt of statements) db.exec(stmt);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

describe('SQLite migrations', () => {
  it('applies every migration from scratch with foreign keys enabled and keeps BACKUP_TABLES in sync', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');

    for (const entry of journal.entries) {
      runMigration(db, entry.tag);
    }

    const rows = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[];
    const dbTables = rows.map((r) => r.name);
    const backupTables = BACKUP_TABLES.map(toSnake).sort();
    expect(dbTables).toEqual(backupTables);

    db.close();
  });

  it('upgrades existing 0000 data through 0005 without losing body photos under foreign keys ON', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');

    runMigration(db, journal.entries[0].tag);

    // Seed initial rows in the 0000 schema.
    db.exec(`
      INSERT INTO profile (id, sex, birth_date, height_cm, activity_level)
      VALUES (1, 'male', '1990-01-15', 180, 'moderate');
      INSERT INTO food_ref (id, name, calories_per_100g, source)
      VALUES (1, 'Milk', 60, 'off');
      INSERT INTO meal (id, eaten_at, day, meal_type, source)
      VALUES (1, '2026-11-24T08:00:00.000Z', '2026-11-24', 'breakfast', 'manual');
      INSERT INTO food_item (id, meal_id, name, grams, calories, food_ref_id)
      VALUES (1, 1, 'Milk', 250, 150, 1);
      INSERT INTO body_check (id, measured_at, neck_cm, waist_cm, body_fat_pct, weight_kg)
      VALUES (1, '2026-11-20T09:00:00.000Z', 40, 88, 18.5, 82);
      INSERT INTO body_photo (id, body_check_id, pose, path, thumb_path)
      VALUES (1, 1, 'front', 'photos/check_1_front.jpg', 'photos/check_1_front_thumb.jpg');
    `);

    for (const entry of journal.entries.slice(1)) {
      runMigration(db, entry.tag);
    }

    // 0001 & 0002: age_years populated and birth_date dropped.
    const profileCols = (db.prepare('PRAGMA table_info(profile)').all() as { name: string }[]).map((c) => c.name);
    expect(profileCols).toContain('age_years');
    expect(profileCols).not.toContain('birth_date');
    const prof = db.prepare('SELECT age_years, age_set_on FROM profile WHERE id = 1').get() as {
      age_years: number;
      age_set_on: string;
    };
    expect(prof.age_years).toBeGreaterThanOrEqual(30);
    expect(prof.age_set_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // 0003 & 0004: unit defaults to 'g' and category is nullable.
    const item = db.prepare('SELECT unit, category FROM food_item WHERE id = 1').get() as {
      unit: string;
      category: string | null;
    };
    expect(item).toEqual({ unit: 'g', category: null });

    // 0005: existing body_photo survived the body_check rebuild, and photos-only check-ins are allowed.
    const photos = db.prepare('SELECT id, body_check_id, pose, path FROM body_photo').all() as {
      id: number;
      body_check_id: number;
      pose: string;
      path: string;
    }[];
    expect(photos).toEqual([
      { id: 1, body_check_id: 1, pose: 'front', path: 'photos/check_1_front.jpg' },
    ]);

    db.exec(`
      INSERT INTO body_check (id, measured_at, neck_cm, waist_cm, body_fat_pct, weight_kg)
      VALUES (2, '2026-11-24T09:00:00.000Z', NULL, NULL, NULL, 81.5);
      INSERT INTO body_photo (body_check_id, pose, path)
      VALUES (2, 'side', 'photos/check_2_side.jpg');
    `);
    expect((db.prepare('SELECT COUNT(*) AS n FROM body_photo').get() as { n: number }).n).toBe(2);

    // Deleting a body_check still cascades to its photos.
    db.exec('DELETE FROM body_check WHERE id = 2');
    expect((db.prepare('SELECT COUNT(*) AS n FROM body_photo').get() as { n: number }).n).toBe(1);

    db.close();
  });
});
