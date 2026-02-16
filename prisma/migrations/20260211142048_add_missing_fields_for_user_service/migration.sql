-- AlterTable
ALTER TABLE `languages` ADD COLUMN `flagUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `modules` ADD COLUMN `thumbnailUrl` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `user_step_progress` ADD COLUMN `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    ADD COLUMN `startedAt` DATETIME(3) NULL,
    ADD COLUMN `timeSpentMinutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalXp` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `unlockedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `discovery_sessions` (
    `id` VARCHAR(50) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
