CREATE TABLE `ocr_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ocrDocumentId` int NOT NULL,
	`action` enum('uploaded','processed','verified','rejected','exported','deleted') NOT NULL,
	`actionDetails` json,
	`performedBy` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ocr_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ocr_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`s3Key` varchar(512) NOT NULL,
	`s3Url` text NOT NULL,
	`originalFileName` varchar(255) NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`vendor` varchar(255),
	`invoiceDate` varchar(50),
	`amount` decimal(12,2),
	`category` enum('fuel','maintenance','tolls','insurance','parking','meals','supplies','utilities','equipment','other') DEFAULT 'other',
	`description` text,
	`ocrConfidence` decimal(3,2),
	`rawOcrText` text,
	`processingStatus` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`processedAt` timestamp,
	`processingError` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ocr_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ocr_verification` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ocrDocumentId` int NOT NULL,
	`verifiedBy` int NOT NULL,
	`verificationStatus` enum('approved','rejected','needs_review') NOT NULL,
	`correctedVendor` varchar(255),
	`correctedAmount` decimal(12,2),
	`correctedCategory` enum('fuel','maintenance','tolls','insurance','parking','meals','supplies','utilities','equipment','other'),
	`correctedDate` varchar(50),
	`notes` text,
	`verifiedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ocr_verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ocr_audit_log` ADD CONSTRAINT `ocr_audit_log_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ocr_audit_log` ADD CONSTRAINT `ocr_audit_log_ocrDocumentId_ocr_documents_id_fk` FOREIGN KEY (`ocrDocumentId`) REFERENCES `ocr_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ocr_audit_log` ADD CONSTRAINT `ocr_audit_log_performedBy_users_id_fk` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ocr_documents` ADD CONSTRAINT `ocr_documents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ocr_verification` ADD CONSTRAINT `ocr_verification_ocrDocumentId_ocr_documents_id_fk` FOREIGN KEY (`ocrDocumentId`) REFERENCES `ocr_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ocr_verification` ADD CONSTRAINT `ocr_verification_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;