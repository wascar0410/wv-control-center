CREATE TABLE `load_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loadId` int NOT NULL,
	`driverId` int NOT NULL,
	`assignedBy` int NOT NULL,
	`status` enum('pending','accepted','rejected','completed') NOT NULL DEFAULT 'pending',
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `load_assignments_id` PRIMARY KEY(`id`)
);
