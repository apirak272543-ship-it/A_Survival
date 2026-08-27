CREATE TABLE `creatorDomainArtifactReviewEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artifactRecordId` int NOT NULL,
	`artifactKey` varchar(191) NOT NULL,
	`action` enum('approve','reject','reopen') NOT NULL,
	`fromStatus` enum('draft','approved','rejected') NOT NULL,
	`toStatus` enum('draft','approved','rejected') NOT NULL,
	`note` varchar(512),
	`reviewerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creatorDomainArtifactReviewEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creatorDomainArtifactReviewEvents` ADD CONSTRAINT `creatorDomainArtifactReviewEvents_artifactRecordId_creatorDomainArtifacts_id_fk` FOREIGN KEY (`artifactRecordId`) REFERENCES `creatorDomainArtifacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creatorDomainArtifactReviewEvents` ADD CONSTRAINT `creatorDomainArtifactReviewEvents_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `creatorDomainArtifactReviewEvents_artifactRecordId_idx` ON `creatorDomainArtifactReviewEvents` (`artifactRecordId`);--> statement-breakpoint
CREATE INDEX `creatorDomainArtifactReviewEvents_artifactKey_idx` ON `creatorDomainArtifactReviewEvents` (`artifactKey`);--> statement-breakpoint
CREATE INDEX `creatorDomainArtifactReviewEvents_reviewerUserId_idx` ON `creatorDomainArtifactReviewEvents` (`reviewerUserId`);--> statement-breakpoint
CREATE INDEX `creatorDomainArtifactReviewEvents_createdAt_idx` ON `creatorDomainArtifactReviewEvents` (`createdAt`);
