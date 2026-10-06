CREATE TABLE `store_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`tax_rate_basis_points` integer,
	`tax_mode` text DEFAULT 'exclusive' NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "store_settings_singleton_id" CHECK("store_settings"."id" = 'store'),
	CONSTRAINT "store_settings_tax_rate_check" CHECK("store_settings"."tax_rate_basis_points" is null or (typeof("store_settings"."tax_rate_basis_points") = 'integer' and "store_settings"."tax_rate_basis_points" between 0 and 10000)),
	CONSTRAINT "store_settings_tax_mode_check" CHECK("store_settings"."tax_mode" in ('exclusive', 'inclusive'))
);
