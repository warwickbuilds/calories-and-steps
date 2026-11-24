/**
 * Local SQLite schema. All measurements are metric (kg, cm, grams);
 * timestamps are ISO 8601 strings, dates are local YYYY-MM-DD.
 * After changing this file run `npm run db:generate` to add a migration.
 */

import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

import { FOOD_CATEGORY_VALUES } from '../lib/foodCategory';

const createdAt = () =>
  text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`);

/** Single row (id = 1). Drives maintenance, Navy formula and goals. */
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey(),
  sex: text('sex', { enum: ['male', 'female'] }).notNull(),
  /** Age in years as entered, and the local date it was entered; see currentAge(). */
  // Defaults only exist so the column could be added to an existing table;
  // the app always writes both values. Backfilled from birth_date in migration 0001.
  ageYears: integer('age_years').notNull().default(30),
  ageSetOn: text('age_set_on').notNull().default('2026-01-01'),
  heightCm: real('height_cm').notNull(),
  activityLevel: text('activity_level', {
    enum: ['sedentary', 'light', 'moderate', 'very', 'extra'],
  }).notNull(),
  unitPref: text('unit_pref', { enum: ['metric', 'imperial'] })
    .notNull()
    .default('metric'),
  themePref: text('theme_pref', { enum: ['system', 'light', 'dark'] })
    .notNull()
    .default('system'),
  goalWeightKg: real('goal_weight_kg'),
  goalDate: text('goal_date'),
  goalMode: text('goal_mode', { enum: ['hard_cut', 'steady_cut', 'maintain', 'bulk'] })
    .notNull()
    .default('steady_cut'),
  stepTarget: integer('step_target').notNull().default(10000),
  /** JSON: { proteinGPerKg?: number, fatPct?: number } */
  macroOverrides: text('macro_overrides', { mode: 'json' }).$type<{
    proteinGPerKg?: number;
    fatPct?: number;
  }>(),
  createdAt: createdAt(),
  updatedAt: text('updated_at'),
});

/** One logged eating event. */
export const meal = sqliteTable(
  'meal',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    eatenAt: text('eaten_at').notNull(),
    /** Local date the meal counts towards. */
    day: text('day').notNull(),
    mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'dinner', 'snack'] }).notNull(),
    source: text('source', { enum: ['photo', 'barcode', 'panel', 'manual'] }).notNull(),
    photoPath: text('photo_path'),
    voiceText: text('voice_text'),
    aiModel: text('ai_model'),
    aiRawJson: text('ai_raw_json'),
    createdAt: createdAt(),
  },
  (t) => [index('meal_day_idx').on(t.day)],
);

/** Cached Open Food Facts products, label reads and saved custom foods. */
export const foodRef = sqliteTable(
  'food_ref',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    barcode: text('barcode'),
    name: text('name').notNull(),
    brand: text('brand'),
    caloriesPer100g: real('calories_per_100g').notNull(),
    proteinPer100g: real('protein_per_100g'),
    carbsPer100g: real('carbs_per_100g'),
    fatPer100g: real('fat_per_100g'),
    servingG: real('serving_g'),
    /** What the per-100 numbers and serving are measured in: grams for food, millilitres for drinks. */
    unit: text('unit', { enum: ['g', 'ml'] })
      .notNull()
      .default('g'),
    /** For the food's icon (see lib/foodCategory). Null means guess it from the name. */
    category: text('category', { enum: FOOD_CATEGORY_VALUES }),
    source: text('source', { enum: ['off', 'panel', 'custom'] }).notNull(),
    isFavourite: integer('is_favourite', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('food_ref_barcode_idx').on(t.barcode)],
);

/** The editable lines inside a meal. */
export const foodItem = sqliteTable(
  'food_item',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    mealId: integer('meal_id')
      .notNull()
      .references(() => meal.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** The amount, in `unit` (the column keeps its old name; for drinks it holds millilitres). */
    grams: real('grams'),
    unit: text('unit', { enum: ['g', 'ml'] })
      .notNull()
      .default('g'),
    calories: real('calories').notNull(),
    proteinG: real('protein_g'),
    carbsG: real('carbs_g'),
    fatG: real('fat_g'),
    confidence: text('confidence', { enum: ['low', 'medium', 'high'] }),
    /** For the food's icon (see lib/foodCategory). Null means guess it from the name. */
    category: text('category', { enum: FOOD_CATEGORY_VALUES }),
    foodRefId: integer('food_ref_id').references(() => foodRef.id, { onDelete: 'set null' }),
  },
  (t) => [index('food_item_meal_idx').on(t.mealId)],
);

export const weightEntry = sqliteTable(
  'weight_entry',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    measuredAt: text('measured_at').notNull(),
    weightKg: real('weight_kg').notNull(),
    /** 'import' = read from another app's screenshots (no DB-level check, so no migration was needed). */
    source: text('source', { enum: ['manual', 'health', 'import'] })
      .notNull()
      .default('manual'),
  },
  (t) => [index('weight_entry_measured_idx').on(t.measuredAt)],
);

/**
 * Navy method check-ins; body-fat % is computed when saved. Neck, waist and
 * body fat are null for a photos-only check-in (migration 0005).
 */
export const bodyCheck = sqliteTable('body_check', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  measuredAt: text('measured_at').notNull(),
  neckCm: real('neck_cm'),
  waistCm: real('waist_cm'),
  hipCm: real('hip_cm'),
  bodyFatPct: real('body_fat_pct'),
  weightKg: real('weight_kg'),
  note: text('note'),
});

export const bodyPhoto = sqliteTable('body_photo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bodyCheckId: integer('body_check_id')
    .notNull()
    .references(() => bodyCheck.id, { onDelete: 'cascade' }),
  pose: text('pose', { enum: ['front', 'side', 'back'] }).notNull(),
  path: text('path').notNull(),
  thumbPath: text('thumb_path'),
});

/** Daily cache of health-app steps for fast charts. */
export const stepsDay = sqliteTable('steps_day', {
  date: text('date').primaryKey(),
  steps: integer('steps').notNull(),
  source: text('source').notNull(),
  updatedAt: text('updated_at'),
});

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;
export type WeightEntry = typeof weightEntry.$inferSelect;
