
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_number` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending_payment' NOT NULL,
	`subtotal_in_centavos` integer NOT NULL,
	`discount_in_centavos` integer DEFAULT 0 NOT NULL,
	`tax_in_centavos` integer DEFAULT 0 NOT NULL,
	`total_in_centavos` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sales_status_check" CHECK("sales"."status" in ('pending_payment', 'paid', 'voided')),
	CONSTRAINT "sales_amounts_integer_nonnegative" CHECK(typeof("sales"."subtotal_in_centavos") = 'integer' and typeof("sales"."discount_in_centavos") = 'integer' and typeof("sales"."tax_in_centavos") = 'integer' and typeof("sales"."total_in_centavos") = 'integer' and "sales"."subtotal_in_centavos" >= 0 and "sales"."discount_in_centavos" >= 0 and "sales"."tax_in_centavos" >= 0 and "sales"."total_in_centavos" >= 0),
	CONSTRAINT "sales_discount_limit" CHECK("sales"."discount_in_centavos" <= "sales"."subtotal_in_centavos"),
	CONSTRAINT "sales_total_check" CHECK("sales"."total_in_centavos" = "sales"."subtotal_in_centavos" - "sales"."discount_in_centavos" + "sales"."tax_in_centavos")
);
--> statement-breakpointCREATE TABLE `sale_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`product_name` text NOT NULL,
	`variant_name` text NOT NULL,
	`sku` text,
	`quantity` integer NOT NULL,
	`unit_price_in_centavos` integer NOT NULL,
	`discount_in_centavos` integer DEFAULT 0 NOT NULL,
	`tax_rate_basis_points` integer,
	`tax_mode` text,
	`tax_in_centavos` integer DEFAULT 0 NOT NULL,
	`line_total_in_centavos` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sale_items_quantity_positive" CHECK(typeof("sale_items"."quantity") = 'integer' and "sale_items"."quantity" > 0),
	CONSTRAINT "sale_items_amounts_integer" CHECK(typeof("sale_items"."unit_price_in_centavos") = 'integer' and typeof("sale_items"."discount_in_centavos") = 'integer' and typeof("sale_items"."tax_in_centavos") = 'integer' and typeof("sale_items"."line_total_in_centavos") = 'integer'),
	CONSTRAINT "sale_items_unit_price_nonnegative" CHECK("sale_items"."unit_price_in_centavos" >= 0),
	CONSTRAINT "sale_items_discount_nonnegative" CHECK("sale_items"."discount_in_centavos" >= 0),
	CONSTRAINT "sale_items_tax_rate_mode_check" CHECK(("sale_items"."tax_rate_basis_points" is null and "sale_items"."tax_mode" is null and "sale_items"."tax_in_centavos" = 0) or ("sale_items"."tax_rate_basis_points" is not null and "sale_items"."tax_rate_basis_points" >= 0 and "sale_items"."tax_mode" in ('exclusive', 'inclusive'))),
	CONSTRAINT "sale_items_tax_nonnegative" CHECK("sale_items"."tax_in_centavos" >= 0),
	CONSTRAINT "sale_items_discount_limit" CHECK("sale_items"."discount_in_centavos" <= "sale_items"."quantity" * "sale_items"."unit_price_in_centavos"),
	CONSTRAINT "sale_items_line_total_nonnegative" CHECK("sale_items"."line_total_in_centavos" >= 0),
	CONSTRAINT "sale_items_total_check" CHECK(("sale_items"."tax_mode" = 'inclusive' and "sale_items"."line_total_in_centavos" = "sale_items"."quantity" * "sale_items"."unit_price_in_centavos" - "sale_items"."discount_in_centavos") or ("sale_items"."tax_mode" is not 'inclusive' and "sale_items"."line_total_in_centavos" = "sale_items"."quantity" * "sale_items"."unit_price_in_centavos" - "sale_items"."discount_in_centavos" + "sale_items"."tax_in_centavos"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sale_items_sale_variant_unique` ON `sale_items` (`sale_id`,`variant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_receipt_number_unique` ON `sales` (`receipt_number`);