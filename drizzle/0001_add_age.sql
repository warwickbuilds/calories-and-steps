ALTER TABLE `profile` ADD `age_years` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `age_set_on` text DEFAULT '2026-01-01' NOT NULL;--> statement-breakpoint
UPDATE `profile` SET
  `age_years` = CAST(strftime('%Y', 'now', 'localtime') AS integer) - CAST(substr(`birth_date`, 1, 4) AS integer)
    - (strftime('%m-%d', 'now', 'localtime') < substr(`birth_date`, 6, 5)),
  `age_set_on` = date('now', 'localtime');
