CREATE TABLE `driver_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`loadId` int,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`accuracy` decimal(8,2),
	`speed` decimal(8,2),
	`heading` decimal(6,2),
	`altitude` decimal(10,2),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `driver_locations` ADD CONSTRAINT `driver_locations_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_locations` ADD CONSTRAINT `driver_locations_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE set null ON UPDATE no action;