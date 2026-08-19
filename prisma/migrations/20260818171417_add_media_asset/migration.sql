-- Stockage média local (remplace Cloudinary pour les nouveaux uploads) :
-- suit le cycle de vie d'un fichier uploadé (processing -> ready/failed),
-- notamment le transcodage HLS asynchrone des vidéos par le worker.

CREATE TABLE `media_assets` (
    `id` VARCHAR(191) NOT NULL,
    `mediaType` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'processing',
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INT NOT NULL,
    `url` VARCHAR(500) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `media_assets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
