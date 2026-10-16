ALTER TABLE `sales` ADD `store_name` text DEFAULT 'KASHERO' NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_store_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`store_name` text DEFAULT 'KASHERO' NOT NULL,
	`tax_rate_basis_points` integer,
	`tax_mode` text DEFAULT 'exclusive' NOT NULL,
	`printer_address` text,
	`printer_name` text,
	`printer_paper_width_mm` integer DEFAULT 58 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "store_settings_singleton_id" CHECK("__new_store_settings"."id" = 'store'),
	CONSTRAINT "store_settings_name_check" CHECK(length(trim("__new_store_settings"."store_name")) between 1 and 30),
	CONSTRAINT "store_settings_tax_rate_check" CHECK("__new_store_settings"."tax_rate_basis_points" is null or (typeof("__new_store_settings"."tax_rate_basis_points") = 'integer' and "__new_store_settings"."tax_rate_basis_points" between 0 and 10000)),
	CONSTRAINT "store_settings_tax_mode_check" CHECK("__new_store_settings"."tax_mode" in ('exclusive', 'inclusive')),
	CONSTRAINT "store_settings_printer_width_check" CHECK("__new_store_settings"."printer_paper_width_mm" in (58, 80))
);
--> statement-breakpoint
INSERT INTO `__new_store_settings`("id", "store_name", "tax_rate_basis_points", "tax_mode", "printer_address", "printer_name", "printer_paper_width_mm", "updated_at") SELECT "id", 'KASHERO', "tax_rate_basis_points", "tax_mode", "printer_address", "printer_name", "printer_paper_width_mm", "updated_at" FROM `store_settings`;--> statement-breakpoint
DROP TABLE `store_settings`;--> statement-breakpoint
ALTER TABLE `__new_store_settings` RENAME TO `store_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
