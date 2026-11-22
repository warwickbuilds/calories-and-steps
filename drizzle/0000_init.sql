CREATE TABLE `body_check` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`measured_at` text NOT NULL,
	`neck_cm` real NOT NULL,
	`waist_cm` real NOT NULL,
	`hip_cm` real,
	`body_fat_pct` real NOT NULL,
	`weight_kg` real,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `body_photo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`body_check_id` integer NOT NULL,
	`pose` text NOT NULL,
	`path` text NOT NULL,
	`thumb_path` text,
	FOREIGN KEY (`body_check_id`) REFERENCES `body_check`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `food_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meal_id` integer NOT NULL,
	`name` text NOT NULL,
	`grams` real,
	`calories` real NOT NULL,
	`protein_g` real,
	`carbs_g` real,
	`fat_g` real,
	`confidence` text,
	`food_ref_id` integer,
	FOREIGN KEY (`meal_id`) REFERENCES `meal`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_ref_id`) REFERENCES `food_ref`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `food_item_meal_idx` ON `food_item` (`meal_id`);--> statement-breakpoint
CREATE TABLE `food_ref` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barcode` text,
	`name` text NOT NULL,
	`brand` text,
	`calories_per_100g` real NOT NULL,
	`protein_per_100g` real,
	`carbs_per_100g` real,
	`fat_per_100g` real,
	`serving_g` real,
	`source` text NOT NULL,
	`is_favourite` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `food_ref_barcode_idx` ON `food_ref` (`barcode`);--> statement-breakpoint
CREATE TABLE `meal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`eaten_at` text NOT NULL,
	`day` text NOT NULL,
	`meal_type` text NOT NULL,
	`source` text NOT NULL,
	`photo_path` text,
	`voice_text` text,
	`ai_model` text,
	`ai_raw_json` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meal_day_idx` ON `meal` (`day`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`sex` text NOT NULL,
	`birth_date` text NOT NULL,
	`height_cm` real NOT NULL,
	`activity_level` text NOT NULL,
	`unit_pref` text DEFAULT 'metric' NOT NULL,
	`theme_pref` text DEFAULT 'system' NOT NULL,
	`goal_weight_kg` real,
	`goal_date` text,
	`goal_mode` text DEFAULT 'steady_cut' NOT NULL,
	`step_target` integer DEFAULT 10000 NOT NULL,
	`macro_overrides` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `steps_day` (
	`date` text PRIMARY KEY NOT NULL,
	`steps` integer NOT NULL,
	`source` text NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `weight_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`measured_at` text NOT NULL,
	`weight_kg` real NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `weight_entry_measured_idx` ON `weight_entry` (`measured_at`);