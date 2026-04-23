-- AlterTable: UserStepProgress - ajouter lastAccessedAt
ALTER TABLE `user_step_progress` ADD COLUMN `lastAccessedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `user_step_progress_userId_lastAccessedAt_idx` ON `user_step_progress`(`userId`, `lastAccessedAt`);
