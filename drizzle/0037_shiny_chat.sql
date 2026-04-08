ALTER TABLE `business_config` ADD `ownerDrawPercent` decimal(5,2) DEFAULT '40.00';--> statement-breakpoint
ALTER TABLE `business_config` ADD `reserveFundPercent` decimal(5,2) DEFAULT '20.00';--> statement-breakpoint
ALTER TABLE `business_config` ADD `reinvestmentPercent` decimal(5,2) DEFAULT '20.00';--> statement-breakpoint
ALTER TABLE `business_config` ADD `operatingCashPercent` decimal(5,2) DEFAULT '20.00';--> statement-breakpoint
ALTER TABLE `business_config` ADD `marginAlertThreshold` decimal(5,2) DEFAULT '10.00';--> statement-breakpoint
ALTER TABLE `business_config` ADD `quoteVarianceThreshold` decimal(5,2) DEFAULT '20.00';--> statement-breakpoint
ALTER TABLE `business_config` ADD `overdueDaysThreshold` int DEFAULT 30;