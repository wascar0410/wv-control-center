CREATE TABLE `route_stops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`stopOrder` int NOT NULL,
	`stopType` enum('pickup','delivery') NOT NULL,
	`address` text NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`weight` decimal(10,2) DEFAULT '0',
	`weightUnit` varchar(10) DEFAULT 'lbs',
	`description` text,
	`distanceFromPrevious` decimal(10,2),
	`durationFromPrevious` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `route_stops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_quotationId_load_quotations_id_fk` FOREIGN KEY (`quotationId`) REFERENCES `load_quotations`(`id`) ON DELETE cascade ON UPDATE no action;