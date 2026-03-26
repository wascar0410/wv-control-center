CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bankName` varchar(255) NOT NULL,
	`accountType` enum('checking','savings','credit_card','other') NOT NULL,
	`accountLast4` varchar(4) NOT NULL,
	`plaidAccountId` varchar(255),
	`plaidAccessToken` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaction_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bankAccountId` int NOT NULL,
	`transactionId` int,
	`externalTransactionId` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`description` text,
	`transactionType` enum('debit','credit') NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`category` varchar(255),
	`isMatched` boolean NOT NULL DEFAULT false,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transaction_imports_id` PRIMARY KEY(`id`)
);
