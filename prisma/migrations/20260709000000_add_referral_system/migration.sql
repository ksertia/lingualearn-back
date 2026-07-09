-- Ajout des champs parrainage sur users
ALTER TABLE `users`
  ADD COLUMN `referralCode` VARCHAR(20) NULL UNIQUE,
  ADD COLUMN `referredBy` VARCHAR(191) NULL;

-- Table referrals
CREATE TABLE `referrals` (
  `id`         VARCHAR(191) NOT NULL,
  `parrainId`  VARCHAR(191) NOT NULL,
  `filleulId`  VARCHAR(191) NOT NULL,
  `status`     VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `rewardedAt` DATETIME(3)  NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `referrals_filleulId_key` (`filleulId`),
  INDEX `referrals_parrainId_idx` (`parrainId`),
  CONSTRAINT `referrals_parrainId_fkey` FOREIGN KEY (`parrainId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `referrals_filleulId_fkey` FOREIGN KEY (`filleulId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
