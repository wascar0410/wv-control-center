CREATE TABLE `export_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exportType` enum('accounting','payroll','payments','transactions','loads','custom') NOT NULL,
	`format` enum('excel','pdf','csv','json') NOT NULL,
	`startDate` varchar(10),
	`endDate` varchar(10),
	`recordCount` int NOT NULL,
	`fileSize` int,
	`fileUrl` varchar(500),
	`exportedBy` int NOT NULL,
	`filters` json,
	`status` enum('pending','completed','failed') DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `export_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentId` int NOT NULL,
	`batchId` int,
	`action` enum('created','updated','processed','failed','refunded','cancelled') NOT NULL,
	`previousStatus` varchar(50),
	`newStatus` varchar(50),
	`performedBy` int NOT NULL,
	`reason` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchNumber` varchar(50) NOT NULL,
	`createdBy` int NOT NULL,
	`period` varchar(20) NOT NULL,
	`status` enum('draft','pending_review','approved','processing','completed','failed','cancelled') DEFAULT 'draft',
	`totalAmount` decimal(15,2) NOT NULL,
	`totalPayments` int NOT NULL,
	`successfulPayments` int DEFAULT 0,
	`failedPayments` int DEFAULT 0,
	`paymentMethod` enum('bank_transfer','stripe','mixed') DEFAULT 'bank_transfer',
	`scheduledDate` timestamp,
	`processedDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_batches_batchNumber_unique` UNIQUE(`batchNumber`)
);
--> statement-breakpoint
ALTER TABLE `export_logs` ADD CONSTRAINT `export_logs_exportedBy_users_id_fk` FOREIGN KEY (`exportedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_audit` ADD CONSTRAINT `payment_audit_paymentId_driver_payments_id_fk` FOREIGN KEY (`paymentId`) REFERENCES `driver_payments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_audit` ADD CONSTRAINT `payment_audit_batchId_payment_batches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `payment_batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_audit` ADD CONSTRAINT `payment_audit_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_batches` ADD CONSTRAINT `payment_batches_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;