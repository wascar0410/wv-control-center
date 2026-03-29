CREATE TABLE `load_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loadId` int NOT NULL,
	`driverId` int NOT NULL,
	`status` enum('sent','read','accepted','rejected') NOT NULL DEFAULT 'sent',
	`emailSent` boolean NOT NULL DEFAULT false,
	`emailSentAt` timestamp,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `load_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `load_notifications` ADD CONSTRAINT `load_notifications_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `load_notifications` ADD CONSTRAINT `load_notifications_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;