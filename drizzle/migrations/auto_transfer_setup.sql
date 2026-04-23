-- Add auto-transfer fields to cash_flow_rules
ALTER TABLE `cash_flow_rules` 
ADD COLUMN `auto_transfer_time` varchar(5) DEFAULT '09:00' AFTER `auto_transfer_day`,
ADD COLUMN `last_auto_transfer_at` timestamp NULL AFTER `auto_transfer_time`;

-- Create auto_transfer_logs table
CREATE TABLE IF NOT EXISTS `auto_transfer_logs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `owner_id` int NOT NULL,
  `cash_flow_rule_id` int NOT NULL,
  `status` enum('success', 'failed', 'skipped') NOT NULL,
  `amount` decimal(12, 2),
  `reason` varchar(255),
  `error` text,
  `from_account_id` int,
  `to_account_id` int,
  `executed_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `auto_transfer_logs_owner_idx` (`owner_id`),
  INDEX `auto_transfer_logs_rule_idx` (`cash_flow_rule_id`),
  INDEX `auto_transfer_logs_status_idx` (`status`),
  INDEX `auto_transfer_logs_executed_idx` (`executed_at`),
  CONSTRAINT `auto_transfer_logs_owner_fk` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `auto_transfer_logs_rule_fk` FOREIGN KEY (`cash_flow_rule_id`) REFERENCES `cash_flow_rules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `auto_transfer_logs_from_fk` FOREIGN KEY (`from_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `auto_transfer_logs_to_fk` FOREIGN KEY (`to_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
