ALTER TABLE `loads` ADD `driverAcceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `loads` ADD `driverRejectedAt` timestamp;--> statement-breakpoint
ALTER TABLE `loads` ADD `driverRejectionReason` varchar(500);