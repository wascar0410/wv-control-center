CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailNotifications` boolean NOT NULL DEFAULT true,
	`smsNotifications` boolean NOT NULL DEFAULT true,
	`pushNotifications` boolean NOT NULL DEFAULT true,
	`notifyOnLoadAssignment` boolean NOT NULL DEFAULT true,
	`notifyOnLoadStatus` boolean NOT NULL DEFAULT true,
	`notifyOnPayment` boolean NOT NULL DEFAULT true,
	`notifyOnMessage` boolean NOT NULL DEFAULT true,
	`notifyOnBonus` boolean NOT NULL DEFAULT true,
	`theme` enum('dark','light','auto') NOT NULL DEFAULT 'dark',
	`language` varchar(10) NOT NULL DEFAULT 'es',
	`timezone` varchar(50) NOT NULL DEFAULT 'America/New_York',
	`showOnlineStatus` boolean NOT NULL DEFAULT true,
	`allowLocationTracking` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `address` text;--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `state` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `zipCode` varchar(10);--> statement-breakpoint
ALTER TABLE `users` ADD `profileImageUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;