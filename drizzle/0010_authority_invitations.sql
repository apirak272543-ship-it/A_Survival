CREATE TABLE `authorityInvitations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `email` varchar(320) NOT NULL,
  `requestedRole` enum('gm','admin') NOT NULL,
  `status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
  `invitedByUserId` int NOT NULL,
  `acceptedUserId` int,
  `note` varchar(512),
  `expiresAt` timestamp NOT NULL,
  `acceptedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `authorityInvitations_id` PRIMARY KEY(`id`),
  CONSTRAINT `authorityInvitations_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`),
  CONSTRAINT `authorityInvitations_acceptedUserId_users_id_fk` FOREIGN KEY (`acceptedUserId`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `authorityInvitations_email_idx` ON `authorityInvitations` (`email`);
--> statement-breakpoint
CREATE INDEX `authorityInvitations_status_idx` ON `authorityInvitations` (`status`);
--> statement-breakpoint
CREATE INDEX `authorityInvitations_createdAt_idx` ON `authorityInvitations` (`createdAt`);
