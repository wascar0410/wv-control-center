CREATE TABLE `invoicePayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paymentDate` timestamp NOT NULL,
	`paymentMethod` varchar(50) NOT NULL,
	`referenceNumber` varchar(100),
	`notes` text,
	`recordedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoicePayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loadId` int NOT NULL,
	`invoiceNumber` varchar(50) NOT NULL,
	`issueDate` timestamp NOT NULL DEFAULT (now()),
	`dueDate` timestamp NOT NULL,
	`brokerName` varchar(255) NOT NULL,
	`brokerId` int,
	`subtotal` decimal(12,2) NOT NULL,
	`taxRate` decimal(5,2) DEFAULT '0.00',
	`taxAmount` decimal(12,2) DEFAULT '0.00',
	`total` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) DEFAULT '0.00',
	`remainingBalance` decimal(12,2) NOT NULL,
	`status` enum('pending','issued','partially_paid','paid','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`issuedAt` timestamp,
	`paidAt` timestamp,
	`overdueAt` timestamp,
	`notes` text,
	`terms` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `receivables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`brokerName` varchar(255) NOT NULL,
	`brokerId` int,
	`invoiceAmount` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) DEFAULT '0.00',
	`outstandingAmount` decimal(12,2) NOT NULL,
	`daysOverdue` int DEFAULT 0,
	`agingBucket` enum('current','30_days','60_days','90_days','120_plus') NOT NULL,
	`status` enum('current','overdue','paid','disputed','written_off') NOT NULL DEFAULT 'current',
	`lastReminderSent` timestamp,
	`reminderCount` int DEFAULT 0,
	`collectionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receivables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `invoicePayments` ADD CONSTRAINT `invoicePayments_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoicePayments` ADD CONSTRAINT `invoicePayments_recordedBy_users_id_fk` FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_brokerId_users_id_fk` FOREIGN KEY (`brokerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receivables` ADD CONSTRAINT `receivables_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receivables` ADD CONSTRAINT `receivables_brokerId_users_id_fk` FOREIGN KEY (`brokerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;