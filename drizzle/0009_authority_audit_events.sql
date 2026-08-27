CREATE TABLE `authorityAuditEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `actorUserId` int NOT NULL,
  `targetUserId` int NOT NULL,
  `action` enum('grant','revoke') NOT NULL,
  `fromRole` enum('user','gm','admin') NOT NULL,
  `toRole` enum('user','gm','admin') NOT NULL,
  `reason` varchar(512) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `authorityAuditEvents_id` PRIMARY KEY(`id`),
  CONSTRAINT `authorityAuditEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`),
  CONSTRAINT `authorityAuditEvents_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `authorityAuditEvents_actorUserId_idx` ON `authorityAuditEvents` (`actorUserId`);
--> statement-breakpoint
CREATE INDEX `authorityAuditEvents_targetUserId_idx` ON `authorityAuditEvents` (`targetUserId`);
--> statement-breakpoint
CREATE INDEX `authorityAuditEvents_createdAt_idx` ON `authorityAuditEvents` (`createdAt`);
