ALTER TABLE `payments`
ADD COLUMN `approval_code` text
CHECK ((`status` <> 'paid' or `method` = 'cash' or (`approval_code` is not null and length(trim(`approval_code`)) > 0)) and (`approval_code` is null or length(`approval_code`) <= 40));--> statement-breakpoint
ALTER TABLE `payments`
ADD COLUMN `terminal_reference` text
CHECK (`terminal_reference` is null or length(`terminal_reference`) <= 80);
