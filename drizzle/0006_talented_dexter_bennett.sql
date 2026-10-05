CREATE TABLE `diagnostic_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`severity` text NOT NULL,
	`event` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	CONSTRAINT "diagnostic_logs_severity_check" CHECK("diagnostic_logs"."severity" in ('info', 'warning', 'error')),
	CONSTRAINT "diagnostic_logs_event_length" CHECK(length(trim("diagnostic_logs"."event")) between 1 and 120),
	CONSTRAINT "diagnostic_logs_metadata_size" CHECK(length("diagnostic_logs"."metadata_json") <= 4000)
);
