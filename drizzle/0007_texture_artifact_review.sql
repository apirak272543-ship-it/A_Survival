ALTER TABLE `creatorArtifacts` ADD `reviewStatus` enum('draft','approved','rejected') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `creatorArtifacts` ADD `reviewNote` varchar(512);--> statement-breakpoint
ALTER TABLE `creatorArtifacts` ADD `reviewedByUserId` int;--> statement-breakpoint
ALTER TABLE `creatorArtifacts` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `creatorArtifacts` ADD CONSTRAINT `creatorArtifacts_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `creatorArtifacts_reviewStatus_idx` ON `creatorArtifacts` (`reviewStatus`);--> statement-breakpoint
CREATE TABLE `creatorArtifactReviewEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `artifactRecordId` int NOT NULL,
  `artifactKey` varchar(191) NOT NULL,
  `action` enum('approve','reject','reopen') NOT NULL,
  `fromStatus` enum('draft','approved','rejected') NOT NULL,
  `toStatus` enum('draft','approved','rejected') NOT NULL,
  `note` varchar(512),
  `reviewerUserId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `creatorArtifactReviewEvents_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
ALTER TABLE `creatorArtifactReviewEvents` ADD CONSTRAINT `creatorArtifactReviewEvents_artifactRecordId_creatorArtifacts_id_fk` FOREIGN KEY (`artifactRecordId`) REFERENCES `creatorArtifacts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creatorArtifactReviewEvents` ADD CONSTRAINT `creatorArtifactReviewEvents_reviewerUserId_users_id_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `creatorArtifactReviewEvents_artifactRecordId_idx` ON `creatorArtifactReviewEvents` (`artifactRecordId`);--> statement-breakpoint
CREATE INDEX `creatorArtifactReviewEvents_artifactKey_idx` ON `creatorArtifactReviewEvents` (`artifactKey`);--> statement-breakpoint
CREATE INDEX `creatorArtifactReviewEvents_reviewerUserId_idx` ON `creatorArtifactReviewEvents` (`reviewerUserId`);--> statement-breakpoint
CREATE INDEX `creatorArtifactReviewEvents_createdAt_idx` ON `creatorArtifactReviewEvents` (`createdAt`);
