CREATE TABLE `driver_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`loadId` int NOT NULL,
	`quotationId` int,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(3) DEFAULT 'USD',
	`status` enum('pending','processing','completed','failed','refunded') DEFAULT 'pending',
	`paymentMethod` enum('bank_transfer','stripe','cash','check') DEFAULT 'bank_transfer',
	`stripePaymentId` varchar(255),
	`bankAccountId` int,
	`notes` text,
	`processedAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `driver_payments` ADD CONSTRAINT `driver_payments_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_payments` ADD CONSTRAINT `driver_payments_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_payments` ADD CONSTRAINT `driver_payments_quotationId_load_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `load_quotations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_payments` ADD CONSTRAINT `driver_payments_bankAccountId_bank_accounts_id_fk` FOREIGN KEY (`bankAccountId`) REFERENCES `bank_accounts`(`id`) ON DELETE set null ON UPDATE no action;