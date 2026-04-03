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
