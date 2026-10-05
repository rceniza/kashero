CREATE TABLE `inventory` (
	`variant_id` text PRIMARY KEY NOT NULL,
	`quantity_on_hand` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "inventory_quantity_integer" CHECK(typeof("inventory"."quantity_on_hand") = 'integer'),
	CONSTRAINT "inventory_quantity_nonnegative" CHECK("inventory"."quantity_on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reason` text NOT NULL,
	`quantity_change` integer NOT NULL,
	`quantity_after` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`occurred_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "inventory_movements_reason_check" CHECK("inventory_movements"."reason" in ('restock', 'sale', 'return', 'correction')),
	CONSTRAINT "inventory_movements_delta_integer" CHECK(typeof("inventory_movements"."quantity_change") = 'integer' and "inventory_movements"."quantity_change" <> 0),
	CONSTRAINT "inventory_movements_balance_integer" CHECK(typeof("inventory_movements"."quantity_after") = 'integer' and "inventory_movements"."quantity_after" >= 0),
	CONSTRAINT "inventory_movements_direction_check" CHECK(("inventory_movements"."reason" in ('restock', 'return') and "inventory_movements"."quantity_change" > 0) or ("inventory_movements"."reason" = 'sale' and "inventory_movements"."quantity_change" < 0) or "inventory_movements"."reason" = 'correction')
);
--> statement-breakpoint
INSERT INTO inventory (variant_id, quantity_on_hand, updated_at)
SELECT id, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM product_variants;
--> statement-breakpoint
CREATE TRIGGER inventory_movements_no_update
BEFORE UPDATE ON inventory_movements
BEGIN SELECT RAISE(ABORT, 'inventory movements are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER inventory_movements_no_delete
BEFORE DELETE ON inventory_movements
BEGIN SELECT RAISE(ABORT, 'inventory movements are append-only'); END;
