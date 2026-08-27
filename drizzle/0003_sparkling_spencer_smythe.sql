CREATE TABLE `creatorArtifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artifactKey` varchar(191) NOT NULL,
	`kind` enum('texture-pack') NOT NULL,
	`packId` varchar(128) NOT NULL,
	`packVersion` varchar(32) NOT NULL,
	`packSha256` varchar(64) NOT NULL,
	`manifest` json NOT NULL,
	`assets` json NOT NULL,
	`provenance` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creatorArtifacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `creatorArtifacts_artifactKey_unique` UNIQUE(`artifactKey`)
);
--> statement-breakpoint
ALTER TABLE `creatorArtifacts` ADD CONSTRAINT `creatorArtifacts_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `creatorArtifacts_packId_idx` ON `creatorArtifacts` (`packId`);--> statement-breakpoint
CREATE INDEX `creatorArtifacts_createdByUserId_idx` ON `creatorArtifacts` (`createdByUserId`);