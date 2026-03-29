CREATE TABLE `audit_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportType` enum('monthly_summary','quarterly_summary','annual_summary','audit_preparation','irs_form_1040','schedule_c') NOT NULL,
	`year` int NOT NULL,
	`month` int,
	`totalIncome` decimal(12,2) NOT NULL,
	`totalExpenses` decimal(12,2) NOT NULL,
	`totalMileage` decimal(10,1) NOT NULL,
	`mileageDeduction` decimal(12,2) NOT NULL,
	`documentedExpenses` int NOT NULL,
	`undocumentedExpenses` int NOT NULL,
	`complianceScore` decimal(5,2) NOT NULL,
	`alerts` int NOT NULL,
	`reportUrl` varchar(512),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alertType` enum('missing_documentation','mileage_discrepancy','expense_without_receipt','income_not_reconciled','unusual_expense','missing_mileage_record','deduction_limit_exceeded','suspicious_pattern','audit_flag') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`relatedEntityType` varchar(50),
	`relatedEntityId` int,
	`recommendedAction` text,
	`resolved` boolean NOT NULL DEFAULT false,
	`resolvedAt` timestamp,
	`resolvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('mileage_recorded','expense_recorded','income_recorded','document_uploaded','validation_passed','validation_failed','alert_generated','report_generated','correction_made','audit_review') NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`description` text,
	`metadata` text,
	`ipAddress` varchar(45),
	`userAgent` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ruleType` enum('deduction_limit','mileage_rate','meal_percentage','home_office_limit','vehicle_depreciation','expense_category_limit') NOT NULL,
	`category` varchar(100),
	`limitAmount` decimal(12,2),
	`percentage` decimal(5,2),
	`active` boolean NOT NULL DEFAULT true,
	`year` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compliance_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expense_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transactionId` int,
	`date` timestamp NOT NULL,
	`vendor` varchar(255) NOT NULL,
	`category` enum('fuel','maintenance','tolls','insurance','parking','meals','supplies','utilities','equipment','depreciation','other') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` text,
	`receiptUrl` varchar(512),
	`receiptFileName` varchar(255),
	`ocrExtractedData` text,
	`ocrConfidence` decimal(3,2),
	`isDeductible` boolean NOT NULL DEFAULT true,
	`deductionReason` varchar(255),
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expense_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `income_verification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`loadId` int,
	`date` timestamp NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`source` varchar(100) NOT NULL,
	`brokerName` varchar(255),
	`invoiceNumber` varchar(100),
	`invoiceUrl` varchar(512),
	`paymentMethod` enum('check','ach','wire','cash','credit_card','other') NOT NULL,
	`paymentDate` timestamp,
	`reconciled` boolean NOT NULL DEFAULT false,
	`reconciledWith` varchar(100),
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `income_verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mileage_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` timestamp NOT NULL,
	`startMileage` decimal(10,1) NOT NULL,
	`endMileage` decimal(10,1) NOT NULL,
	`businessMiles` decimal(10,1) NOT NULL,
	`personalMiles` decimal(10,1) NOT NULL,
	`purpose` varchar(255) NOT NULL,
	`loadId` int,
	`notes` text,
	`documentedBy` varchar(100),
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mileage_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_reports` ADD CONSTRAINT `audit_reports_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_alerts` ADD CONSTRAINT `compliance_alerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_alerts` ADD CONSTRAINT `compliance_alerts_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_audit_log` ADD CONSTRAINT `compliance_audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `compliance_rules` ADD CONSTRAINT `compliance_rules_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expense_receipts` ADD CONSTRAINT `expense_receipts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expense_receipts` ADD CONSTRAINT `expense_receipts_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `income_verification` ADD CONSTRAINT `income_verification_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `income_verification` ADD CONSTRAINT `income_verification_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mileage_records` ADD CONSTRAINT `mileage_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mileage_records` ADD CONSTRAINT `mileage_records_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;