ALTER TABLE `load_quotations` ADD `manualVerdict` varchar(50);--> statement-breakpoint
ALTER TABLE `load_quotations` ADD `verdictNotes` text;--> statement-breakpoint
ALTER TABLE `load_quotations` ADD `verdictOverriddenBy` int;--> statement-breakpoint
ALTER TABLE `load_quotations` ADD `verdictOverriddenAt` timestamp;