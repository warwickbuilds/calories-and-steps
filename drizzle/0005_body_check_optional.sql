-- Neck, waist and body fat become optional so a check-in can be photos only.
-- SQLite can't drop NOT NULL, so body_check is rebuilt. Migrations run inside a
-- transaction with foreign keys ON (PRAGMA foreign_keys can't change there), and
-- dropping body_check would cascade-delete every body_photo row. So the photos
-- are parked in a plain copy first and body_photo is rebuilt after.
CREATE TABLE `__new_body_check` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`measured_at` text NOT NULL,
	`neck_cm` real,
	`waist_cm` real,
	`hip_cm` real,
	`body_fat_pct` real,
	`weight_kg` real,
	`note` text
);
--> statement-breakpoint
INSERT INTO `__new_body_check`("id", "measured_at", "neck_cm", "waist_cm", "hip_cm", "body_fat_pct", "weight_kg", "note") SELECT "id", "measured_at", "neck_cm", "waist_cm", "hip_cm", "body_fat_pct", "weight_kg", "note" FROM `body_check`;--> statement-breakpoint
CREATE TABLE `__body_photo_copy` AS SELECT * FROM `body_photo`;--> statement-breakpoint
DROP TABLE `body_photo`;--> statement-breakpoint
DROP TABLE `body_check`;--> statement-breakpoint
ALTER TABLE `__new_body_check` RENAME TO `body_check`;--> statement-breakpoint
CREATE TABLE `body_photo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`body_check_id` integer NOT NULL,
	`pose` text NOT NULL,
	`path` text NOT NULL,
	`thumb_path` text,
	FOREIGN KEY (`body_check_id`) REFERENCES `body_check`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `body_photo`("id", "body_check_id", "pose", "path", "thumb_path") SELECT "id", "body_check_id", "pose", "path", "thumb_path" FROM `__body_photo_copy`;--> statement-breakpoint
DROP TABLE `__body_photo_copy`;
