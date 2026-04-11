ALTER TABLE `business_config` DROP FOREIGN KEY `business_config_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `user_preferences` DROP FOREIGN KEY `user_preferences_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `loads` MODIFY COLUMN `estimatedFuel` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `loads` MODIFY COLUMN `estimatedTolls` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `invoices` ADD `tax_rate` decimal(5,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `invoices` ADD `tax_amount` decimal(12,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `business_config` ADD CONSTRAINT `business_config_user_id_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_driver_id_unique` UNIQUE(`driverId`);--> statement-breakpoint
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_config` ADD CONSTRAINT `business_config_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_logs` ADD CONSTRAINT `fuel_logs_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fuel_logs` ADD CONSTRAINT `fuel_logs_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `load_assignments` ADD CONSTRAINT `load_assignments_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `load_assignments` ADD CONSTRAINT `load_assignments_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `load_assignments` ADD CONSTRAINT `load_assignments_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loads` ADD CONSTRAINT `loads_assignedDriverId_users_id_fk` FOREIGN KEY (`assignedDriverId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loads` ADD CONSTRAINT `loads_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pod_documents` ADD CONSTRAINT `pod_documents_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pod_documents` ADD CONSTRAINT `pod_documents_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pod_documents` ADD CONSTRAINT `pod_documents_assignmentId_load_assignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `load_assignments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_referenceLoadId_loads_id_fk` FOREIGN KEY (`referenceLoadId`) REFERENCES `loads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `alerts_recipient_user_idx` ON `alerts` (`recipientUserId`);--> statement-breakpoint
CREATE INDEX `alerts_is_read_idx` ON `alerts` (`isRead`);--> statement-breakpoint
CREATE INDEX `alerts_severity_idx` ON `alerts` (`severity`);--> statement-breakpoint
CREATE INDEX `bank_accounts_user_idx` ON `bank_accounts` (`userId`);--> statement-breakpoint
CREATE INDEX `fuel_logs_driver_idx` ON `fuel_logs` (`driverId`);--> statement-breakpoint
CREATE INDEX `fuel_logs_load_idx` ON `fuel_logs` (`loadId`);--> statement-breakpoint
CREATE INDEX `load_assignments_load_idx` ON `load_assignments` (`loadId`);--> statement-breakpoint
CREATE INDEX `load_assignments_driver_idx` ON `load_assignments` (`driverId`);--> statement-breakpoint
CREATE INDEX `load_assignments_assigned_by_idx` ON `load_assignments` (`assignedBy`);--> statement-breakpoint
CREATE INDEX `loads_status_idx` ON `loads` (`status`);--> statement-breakpoint
CREATE INDEX `loads_assigned_driver_idx` ON `loads` (`assignedDriverId`);--> statement-breakpoint
CREATE INDEX `loads_created_by_idx` ON `loads` (`createdBy`);--> statement-breakpoint
CREATE INDEX `pod_documents_load_idx` ON `pod_documents` (`loadId`);--> statement-breakpoint
CREATE INDEX `pod_documents_driver_idx` ON `pod_documents` (`driverId`);--> statement-breakpoint
CREATE INDEX `settlements_status_idx` ON `settlements` (`status`);--> statement-breakpoint
CREATE INDEX `settlements_period_idx` ON `settlements` (`settlementPeriod`);--> statement-breakpoint
CREATE INDEX `task_comments_task_idx` ON `taskComments` (`taskId`);--> statement-breakpoint
CREATE INDEX `task_comments_author_idx` ON `taskComments` (`authorId`);--> statement-breakpoint
CREATE INDEX `tasks_assigned_to_idx` ON `tasks` (`assignedTo`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_priority_idx` ON `tasks` (`priority`);--> statement-breakpoint
CREATE INDEX `transactions_reference_load_idx` ON `transactions` (`referenceLoadId`);--> statement-breakpoint
CREATE INDEX `transactions_created_by_idx` ON `transactions` (`createdBy`);--> statement-breakpoint
CREATE INDEX `wallets_status_idx` ON `wallets` (`status`);--> statement-breakpoint
ALTER TABLE `invoices` DROP COLUMN `taxRate`;--> statement-breakpoint
ALTER TABLE `invoices` DROP COLUMN `taxAmount`;