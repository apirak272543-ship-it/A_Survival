ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user','gm','admin','master') NOT NULL DEFAULT 'user';
