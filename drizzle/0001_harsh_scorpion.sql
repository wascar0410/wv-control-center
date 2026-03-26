CREATE TABLE `fuel_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`loadId` int,
	`amount` decimal(10,2) NOT NULL,
	`gallons` decimal(8,3),
	`pricePerGallon` decimal(6,3),
	`location` text,
	`receiptUrl` text,
	`logDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fuel_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`pickupAddress` text NOT NULL,
	`deliveryAddress` text NOT NULL,
	`pickupLat` decimal(10,7),
	`pickupLng` decimal(10,7),
	`deliveryLat` decimal(10,7),
	`deliveryLng` decimal(10,7),
	`weight` decimal(10,2) NOT NULL,
	`weightUnit` varchar(10) NOT NULL DEFAULT 'lbs',
	`merchandiseType` varchar(255) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`estimatedFuel` decimal(10,2) DEFAULT '0',
	`estimatedTolls` decimal(10,2) DEFAULT '0',
	`netMargin` decimal(10,2),
	`status` enum('available','in_transit','delivered','invoiced','paid') NOT NULL DEFAULT 'available',
	`assignedDriverId` int,
	`notes` text,
	`bolImageUrl` text,
	`pickupDate` timestamp,
	`deliveryDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdBy` int,
	CONSTRAINT `loads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owner_draws` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`period` varchar(7) NOT NULL,
	`notes` text,
	`drawDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `owner_draws_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partnership` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerName` varchar(255) NOT NULL,
	`partnerRole` varchar(100) NOT NULL,
	`participationPercent` decimal(5,2) NOT NULL,
	`userId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partnership_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('income','expense') NOT NULL,
	`category` enum('load_payment','fuel','maintenance','insurance','subscriptions','phone','payroll','tolls','other') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`description` text,
	`referenceLoadId` int,
	`receiptUrl` text,
	`transactionDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`createdBy` int,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','driver') NOT NULL DEFAULT 'user';