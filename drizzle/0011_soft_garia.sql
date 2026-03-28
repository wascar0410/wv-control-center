CREATE TABLE `business_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fuelPricePerGallon` decimal(6,2) DEFAULT '3.60',
	`vanMpg` decimal(5,1) DEFAULT '18.0',
	`maintenancePerMile` decimal(6,3) DEFAULT '0.12',
	`tiresPerMile` decimal(6,3) DEFAULT '0.03',
	`insuranceMonthly` decimal(8,2) DEFAULT '450.00',
	`phoneInternetMonthly` decimal(8,2) DEFAULT '70.00',
	`loadBoardAppsMonthly` decimal(8,2) DEFAULT '45.00',
	`accountingSoftwareMonthly` decimal(8,2) DEFAULT '30.00',
	`otherFixedMonthly` decimal(8,2) DEFAULT '80.00',
	`targetMilesPerMonth` int DEFAULT 4000,
	`minimumProfitPerMile` decimal(6,2) DEFAULT '1.50',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `distance_surcharge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromMiles` int NOT NULL,
	`surchargePerMile` decimal(6,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distance_surcharge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weight_surcharge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromLbs` int NOT NULL,
	`surchargePerMile` decimal(6,3) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weight_surcharge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `business_config` ADD CONSTRAINT `business_config_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `distance_surcharge` ADD CONSTRAINT `distance_surcharge_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weight_surcharge` ADD CONSTRAINT `weight_surcharge_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;