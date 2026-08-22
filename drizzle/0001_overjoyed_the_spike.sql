CREATE TABLE `gameIntegrityLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`severity` enum('info','warning','blocked') NOT NULL,
	`code` varchar(64) NOT NULL,
	`details` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameIntegrityLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gameItemInstances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`instanceId` varchar(96) NOT NULL,
	`definitionId` varchar(96) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`enhancement` int NOT NULL DEFAULT 0,
	`tier` varchar(24) NOT NULL,
	`quarantined` int NOT NULL DEFAULT 0,
	`acquiredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameItemInstances_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameItemInstances_instanceId_unique` UNIQUE(`instanceId`)
);
--> statement-breakpoint
CREATE TABLE `gameProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` varchar(24) NOT NULL,
	`deviceToken` varchar(96) NOT NULL,
	`displayName` varchar(48) NOT NULL,
	`health` int NOT NULL DEFAULT 100,
	`currency` int NOT NULL DEFAULT 0,
	`lastMapId` varchar(128) NOT NULL DEFAULT 'obsidian-frontier',
	`syncVersion` int NOT NULL DEFAULT 1,
	`lastClientSaveAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameProfiles_playerId_unique` UNIQUE(`playerId`)
);
--> statement-breakpoint
CREATE TABLE `gameSaves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`payload` json NOT NULL,
	`checksum` varchar(128) NOT NULL,
	`clientUpdatedAt` timestamp NOT NULL,
	`serverValidatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gameSaves_id` PRIMARY KEY(`id`),
	CONSTRAINT `gameSaves_profileId_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE TABLE `itemProvenance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`itemInstanceId` varchar(96) NOT NULL,
	`sourceType` enum('drop','craft','harvest','reward','starter') NOT NULL,
	`sourceRef` varchar(128) NOT NULL,
	`metadata` json,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itemProvenance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gameIntegrityLogs` ADD CONSTRAINT `gameIntegrityLogs_profileId_gameProfiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `gameProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gameItemInstances` ADD CONSTRAINT `gameItemInstances_profileId_gameProfiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `gameProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gameSaves` ADD CONSTRAINT `gameSaves_profileId_gameProfiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `gameProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itemProvenance` ADD CONSTRAINT `itemProvenance_profileId_gameProfiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `gameProfiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `gameIntegrityLogs_profileId_idx` ON `gameIntegrityLogs` (`profileId`);--> statement-breakpoint
CREATE INDEX `gameItemInstances_profileId_idx` ON `gameItemInstances` (`profileId`);--> statement-breakpoint
CREATE INDEX `gameProfiles_deviceToken_idx` ON `gameProfiles` (`deviceToken`);--> statement-breakpoint
CREATE INDEX `itemProvenance_profileId_idx` ON `itemProvenance` (`profileId`);--> statement-breakpoint
CREATE INDEX `itemProvenance_instanceId_idx` ON `itemProvenance` (`itemInstanceId`);