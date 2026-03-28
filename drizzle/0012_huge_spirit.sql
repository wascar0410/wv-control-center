CREATE TABLE `price_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`quotationId` int NOT NULL,
	`clientName` varchar(255),
	`pickupAddress` text NOT NULL,
	`deliveryAddress` text NOT NULL,
	`offeredPrice` decimal(10,2) NOT NULL,
	`ratePerLoadedMile` decimal(10,2) NOT NULL,
	`minimumProfitPerMile` decimal(6,2) NOT NULL,
	`differenceFromMinimum` decimal(10,2) NOT NULL,
	`severity` enum('warning','critical') NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `price_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `price_alerts` ADD CONSTRAINT `price_alerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_alerts` ADD CONSTRAINT `price_alerts_quotationId_load_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `load_quotations`(`id`) ON DELETE cascade ON UPDATE no action;