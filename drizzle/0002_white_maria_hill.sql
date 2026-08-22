CREATE TABLE `gameSyncTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`txId` varchar(96) NOT NULL,
	`profileId` int NOT NULL,
	`actorId` varchar(96) NOT NULL,
	`actionType` varchar(96) NOT NULL,
	`payload` json NOT NULL,
	`vectorClock` json NOT NULL,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameSyncTransactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameSyncTransactions_txId_unique` UNIQUE(`txId`)
);
--> statement-breakpoint
ALTER TABLE `gameProfiles` ADD `vectorClock` json;--> statement-breakpoint
ALTER TABLE `gameSyncTransactions` ADD CONSTRAINT `gameSyncTransactions_profileId_gameProfiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `gameProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `gameSyncTransactions_profileId_idx` ON `gameSyncTransactions` (`profileId`);