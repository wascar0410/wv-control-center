CREATE TABLE `broker_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brokerName` enum('coyote','dat','other') NOT NULL,
	`encryptedApiKey` text NOT NULL,
	`encryptedApiSecret` text NOT NULL,
	`syncIntervalMinutes` int NOT NULL DEFAULT 15,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `broker_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `broker_loads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brokerId` varchar(100) NOT NULL,
	`brokerName` enum('coyote','dat','manual','other') NOT NULL,
	`pickupAddress` text NOT NULL,
	`deliveryAddress` text NOT NULL,
	`pickupLat` decimal(10,7),
	`pickupLng` decimal(10,7),
	`deliveryLat` decimal(10,7),
	`deliveryLng` decimal(10,7),
	`weight` decimal(10,2) NOT NULL,
	`weightUnit` varchar(10) NOT NULL DEFAULT 'lbs',
	`commodity` varchar(255),
	`offeredRate` decimal(10,2) NOT NULL,
	`calculatedDistance` decimal(10,2),
	`calculatedProfit` decimal(10,2),
	`marginPercent` decimal(5,2),
	`verdict` enum('ACEPTAR','NEGOCIAR','RECHAZAR') DEFAULT 'NEGOCIAR',
	`status` enum('new','reviewed','accepted','rejected','expired','converted') NOT NULL DEFAULT 'new',
	`pickupDate` timestamp,
	`deliveryDate` timestamp,
	`expiresAt` timestamp,
	`convertedQuotationId` int,
	`rawData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `broker_loads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`brokerName` enum('coyote','dat','manual','other') NOT NULL,
	`loadsFound` int DEFAULT 0,
	`loadsImported` int DEFAULT 0,
	`loadsSkipped` int DEFAULT 0,
	`status` enum('success','failed','partial') NOT NULL,
	`errorMessage` text,
	`executedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `broker_credentials` ADD CONSTRAINT `broker_credentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broker_loads` ADD CONSTRAINT `broker_loads_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `broker_loads` ADD CONSTRAINT `broker_loads_convertedQuotationId_load_quotations_id_fk` FOREIGN KEY (`convertedQuotationId`) REFERENCES `load_quotations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_logs` ADD CONSTRAINT `sync_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;