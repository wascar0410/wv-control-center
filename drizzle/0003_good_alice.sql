CREATE TABLE `pod_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loadId` int NOT NULL,
	`driverId` int NOT NULL,
	`assignmentId` int,
	`documentUrl` text NOT NULL,
	`documentKey` varchar(512) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int,
	`mimeType` varchar(50),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pod_documents_id` PRIMARY KEY(`id`)
);
