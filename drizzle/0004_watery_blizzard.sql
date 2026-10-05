CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`user_id` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`amount_in_centavos` integer NOT NULL,
	`tendered_in_centavos` integer NOT NULL,
	`change_in_centavos` integer DEFAULT 0 NOT NULL,
	`failure_reason` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "payments_method_check" CHECK("payments"."method" in ('cash', 'maya_terminal', 'metrobank_terminal')),
	CONSTRAINT "payments_status_check" CHECK("payments"."status" in ('pending', 'paid', 'failed', 'cancelled')),
	CONSTRAINT "payments_amounts_integer_nonnegative" CHECK(typeof("payments"."amount_in_centavos") = 'integer' and typeof("payments"."tendered_in_centavos") = 'integer' and typeof("payments"."change_in_centavos") = 'integer' and "payments"."amount_in_centavos" >= 0 and "payments"."tendered_in_centavos" >= 0 and "payments"."change_in_centavos" >= 0),
	CONSTRAINT "payments_settlement_check" CHECK("payments"."status" <> 'paid' or ("payments"."method" = 'cash' and "payments"."amount_in_centavos" <= "payments"."tendered_in_centavos" and "payments"."change_in_centavos" = "payments"."tendered_in_centavos" - "payments"."amount_in_centavos") or ("payments"."method" in ('maya_terminal', 'metrobank_terminal') and "payments"."amount_in_centavos" = "payments"."tendered_in_centavos" and "payments"."change_in_centavos" = 0))
);
