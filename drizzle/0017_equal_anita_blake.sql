CREATE TABLE `chat_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dispatcherId` int NOT NULL,
	`loadId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`loadId` int,
	`message` text NOT NULL,
	`attachmentUrl` varchar(512),
	`attachmentType` varchar(50),
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`senderId` int NOT NULL,
	`messageId` int NOT NULL,
	`conversationId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`notificationType` enum('direct_message','group_message','assignment_update','status_change') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastReadAt` timestamp,
	CONSTRAINT `chat_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_dispatcherId_users_id_fk` FOREIGN KEY (`dispatcherId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_conversations` ADD CONSTRAINT `chat_conversations_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_loadId_loads_id_fk` FOREIGN KEY (`loadId`) REFERENCES `loads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_notifications` ADD CONSTRAINT `chat_notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_notifications` ADD CONSTRAINT `chat_notifications_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_notifications` ADD CONSTRAINT `chat_notifications_messageId_chat_messages_id_fk` FOREIGN KEY (`messageId`) REFERENCES `chat_messages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_notifications` ADD CONSTRAINT `chat_notifications_conversationId_chat_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `chat_conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_conversationId_chat_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `chat_conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;