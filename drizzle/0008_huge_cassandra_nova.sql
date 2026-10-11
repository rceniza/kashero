ALTER TABLE `store_settings` ADD COLUMN `printer_address` text;
--> statement-breakpoint
ALTER TABLE `store_settings` ADD COLUMN `printer_name` text;
--> statement-breakpoint
ALTER TABLE `store_settings` ADD COLUMN `printer_paper_width_mm` integer DEFAULT 58 NOT NULL CHECK (`printer_paper_width_mm` in (58, 80));
