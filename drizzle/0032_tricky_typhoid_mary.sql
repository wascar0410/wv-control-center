CREATE TABLE `business_plan_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('page_view','pdf_download','contact_click','section_view','form_submit') NOT NULL,
	`sectionId` varchar(100),
	`referrer` varchar(500),
	`userAgent` varchar(500),
	`ipAddress` varchar(64),
	`sessionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `business_plan_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `load_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loadId` int NOT NULL,
	`driverId` int NOT NULL,
	`evidenceType` enum('pickup_photo','delivery_photo','bol_scan','damage_report','signature','receipt','other') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int,
	`mimeType` varchar(50),
	`caption` varchar(500),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`capturedAt` timestamp,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `load_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loadId` int NOT NULL,
	`driverId` int NOT NULL,
	`blockReason` enum('missing_bol','missing_pod','missing_signature','bol_verification','dispute','compliance','manual') NOT NULL,
	`blockedAmount` decimal(12,2) NOT NULL,
	`blockDescription` text,
	`bolReceivedAt` timestamp,
	`bolVerifiedAt` timestamp,
	`bolVerifiedBy` int,
	`status` enum('active','resolved','released','disputed') NOT NULL DEFAULT 'active',
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`resolutionNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settlement_loads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settlementId` int NOT NULL,
	`loadId` int NOT NULL,
	`loadIncome` decimal(12,2) NOT NULL,
	`loadExpenses` decimal(12,2) DEFAULT '0.00',
	`loadProfit` decimal(12,2) NOT NULL,
	`partner1Amount` decimal(12,2) NOT NULL,
	`partner2Amount` decimal(12,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `settlement_loads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settlementPeriod` varchar(7) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`totalLoadsCompleted` int DEFAULT 0,
	`totalIncome` decimal(12,2) NOT NULL DEFAULT '0.00',
	`totalExpenses` decimal(12,2) NOT NULL DEFAULT '0.00',
	`totalProfit` decimal(12,2) NOT NULL DEFAULT '0.00',
	`partner1Id` int NOT NULL,
	`partner1Share` decimal(5,2) NOT NULL DEFAULT '50.00',
	`partner1Amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`partner2Id` int NOT NULL,
	`partner2Share` decimal(5,2) NOT NULL DEFAULT '50.00',
	`partner2Amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`status` enum('draft','calculated','approved','processed','completed','disputed') NOT NULL DEFAULT 'draft',
	`calculatedAt` timestamp,
	`approvedAt` timestamp,
	`approvedBy` int,
	`processedAt` timestamp,
	`completedAt` timestamp,
	`notes` text,
	`disputeNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletId` int NOT NULL,
	`driverId` int NOT NULL,
	`type` enum('load_payment','withdrawal','adjustment','fee','bonus','refund','chargeback') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`loadId` int,
	`settlementId` int,
	`withdrawalId` int,
	`description` text,
	`notes` text,
	`status` enum('pending','completed','failed','reversed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`failureReason` text,
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`totalEarnings` decimal(12,2) NOT NULL DEFAULT '0.00',
	`availableBalance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`pendingBalance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`blockedBalance` decimal(12,2) NOT NULL DEFAULT '0.00',
	`bankAccountId` varchar(255),
	`bankAccountLast4` varchar(4),
	`bankAccountName` varchar(255),
	`minimumWithdrawalAmount` decimal(10,2) DEFAULT '50.00',
	`withdrawalFeePercent` decimal(5,2) DEFAULT '0.00',
	`status` enum('active','suspended','closed') NOT NULL DEFAULT 'active',
	`suspensionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletId` int NOT NULL,
	`driverId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`fee` decimal(10,2) DEFAULT '0.00',
	`netAmount` decimal(12,2) NOT NULL,
	`method` enum('bank_transfer','check','paypal','venmo','other') NOT NULL DEFAULT 'bank_transfer',
	`bankAccountId` varchar(255),
	`status` enum('requested','approved','processing','completed','failed','cancelled') NOT NULL DEFAULT 'requested',
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`approvedBy` int,
	`processedAt` timestamp,
	`completedAt` timestamp,
	`failureReason` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `loads` ADD `rateConfirmationNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `fleetType` enum('internal','leased','external') DEFAULT 'internal';--> statement-breakpoint
ALTER TABLE `users` ADD `commissionPercent` decimal(5,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `users` ADD `dotNumber` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `vehicleInfo` text;--> statement-breakpoint
ALTER TABLE `users` ADD `licenseUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `insuranceUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `leaseContractUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `locationSharingEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `load_evidence` ADD CONSTRAINT `load_evidence_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `load_evidence` ADD CONSTRAINT `load_evidence_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_blocks` ADD CONSTRAINT `payment_blocks_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_blocks` ADD CONSTRAINT `payment_blocks_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_blocks` ADD CONSTRAINT `payment_blocks_bolVerifiedBy_users_id_fk` FOREIGN KEY (`bolVerifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_blocks` ADD CONSTRAINT `payment_blocks_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settlement_loads` ADD CONSTRAINT `settlement_loads_settlementId_settlements_id_fk` FOREIGN KEY (`settlementId`) REFERENCES `settlements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settlement_loads` ADD CONSTRAINT `settlement_loads_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settlements` ADD CONSTRAINT `settlements_partner1Id_users_id_fk` FOREIGN KEY (`partner1Id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settlements` ADD CONSTRAINT `settlements_partner2Id_users_id_fk` FOREIGN KEY (`partner2Id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settlements` ADD CONSTRAINT `settlements_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_walletId_wallets_id_fk` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_settlementId_settlements_id_fk` FOREIGN KEY (`settlementId`) REFERENCES `settlements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_withdrawalId_withdrawals_id_fk` FOREIGN KEY (`withdrawalId`) REFERENCES `withdrawals`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_walletId_wallets_id_fk` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;