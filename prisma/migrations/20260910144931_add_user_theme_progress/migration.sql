-- CreateTable
CREATE TABLE `user_theme_progress` (
  `id`                  VARCHAR(191) NOT NULL,
  `userId`              VARCHAR(191) NOT NULL,
  `themeId`             VARCHAR(191) NOT NULL,
  `progressPercentage`  DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `startedAt`           DATETIME(3) NULL,
  `completedAt`         DATETIME(3) NULL,
  `lastAccessedAt`      DATETIME(3) NULL,
  `createdAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `user_theme_progress_userId_themeId_key` (`userId`, `themeId`),
  INDEX `user_theme_progress_themeId_idx` (`themeId`),
  INDEX `user_theme_progress_userId_idx` (`userId`),
  CONSTRAINT `user_theme_progress_themeId_fkey` FOREIGN KEY (`themeId`) REFERENCES `themes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_theme_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
