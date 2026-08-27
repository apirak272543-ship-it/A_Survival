CREATE TABLE `creatorDomainArtifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artifactKey` varchar(191) NOT NULL,
	`domain` enum('world','block','structure','item','weapon','animation','quest','profiler') NOT NULL,
	`artifactId` varchar(128) NOT NULL,
	`artifactVersion` varchar(32) NOT NULL,
	`generatorId` varchar(128) NOT NULL,
	`generatorVersion` varchar(32) NOT NULL,
	`contentSha256` varchar(64) NOT NULL,
	`manifest` json NOT NULL,
	`summary` json NOT NULL,
	`provenance` json NOT NULL,
	`runtimePolicy` json NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creatorDomainArtifacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `creatorDomainArtifacts_artifactKey_unique` UNIQUE(`artifactKey`)
);
--> statement-breakpoint
ALTER TABLE `creatorDomainArtifacts` ADD CONSTRAINT `creatorDomainArtifacts_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `creatorDomainArtifacts_domain_idx` ON `creatorDomainArtifacts` (`domain`);
--> statement-breakpoint
CREATE INDEX `creatorDomainArtifacts_createdByUserId_idx` ON `creatorDomainArtifacts` (`createdByUserId`);
--> statement-breakpoint
CREATE INDEX `creatorDomainArtifacts_createdAt_idx` ON `creatorDomainArtifacts` (`createdAt`);
