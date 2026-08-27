ALTER TABLE `creatorDomainArtifacts` ADD `reviewStatus` enum('draft','approved','rejected') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `creatorDomainArtifacts` ADD `reviewNote` varchar(512);--> statement-breakpoint
ALTER TABLE `creatorDomainArtifacts` ADD `reviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `creatorDomainArtifacts` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `creatorDomainArtifacts` ADD CONSTRAINT `creatorDomainArtifacts_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `creatorDomainArtifacts_reviewStatus_idx` ON `creatorDomainArtifacts` (`reviewStatus`);
