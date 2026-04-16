-- Banking Setup and Cash Flow Rule Tables

-- Bank Account Classifications
CREATE TABLE IF NOT EXISTS `bankAccountClassifications` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bankAccountId` int NOT NULL,
  `classification` enum('operating','reserve','personal') NOT NULL DEFAULT 'operating',
  `label` varchar(255),
  `description` text,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`bankAccountId`) REFERENCES `bankAccounts`(`id`) ON DELETE CASCADE,
  INDEX `bank_account_classifications_account_idx` (`bankAccountId`),
  INDEX `bank_account_classifications_type_idx` (`classification`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cash Flow Rules
CREATE TABLE IF NOT EXISTS `cashFlowRules` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ownerId` int NOT NULL,
  `reservePercent` decimal(5,2) NOT NULL DEFAULT 20.00,
  `minReserveAmount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `maxReserveAmount` decimal(12,2) NOT NULL DEFAULT 999999.99,
  `autoTransferEnabled` boolean NOT NULL DEFAULT false,
  `autoTransferDay` int,
  `operatingAccountId` int,
  `reserveAccountId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`operatingAccountId`) REFERENCES `bankAccounts`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reserveAccountId`) REFERENCES `bankAccounts`(`id`) ON DELETE SET NULL,
  INDEX `cash_flow_rules_owner_idx` (`ownerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reserve Transfer Suggestions
CREATE TABLE IF NOT EXISTS `reserveTransferSuggestions` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ownerId` int NOT NULL,
  `fromAccountId` int NOT NULL,
  `toAccountId` int NOT NULL,
  `suggestedAmount` decimal(12,2) NOT NULL,
  `transferredAmount` decimal(12,2),
  `status` enum('suggested','pending','completed','cancelled') NOT NULL DEFAULT 'suggested',
  `reason` varchar(255),
  `transactionId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`fromAccountId`) REFERENCES `bankAccounts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`toAccountId`) REFERENCES `bankAccounts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`transactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL,
  INDEX `reserve_transfer_suggestions_owner_idx` (`ownerId`),
  INDEX `reserve_transfer_suggestions_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
