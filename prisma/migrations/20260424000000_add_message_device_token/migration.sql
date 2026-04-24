-- CreateTable: Message
CREATE TABLE `messages` (
    `id`          VARCHAR(191) NOT NULL,
    `senderId`    VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `content`     TEXT NOT NULL,
    `type`        VARCHAR(20) NOT NULL DEFAULT 'text',
    `metadata`    JSON NULL,
    `isRead`      BOOLEAN NOT NULL DEFAULT false,
    `readAt`      DATETIME(3) NULL,
    `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`   DATETIME(3) NOT NULL,

    INDEX `messages_senderId_recipientId_idx`(`senderId`, `recipientId`),
    INDEX `messages_recipientId_isRead_idx`(`recipientId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `messages` ADD CONSTRAINT `messages_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: DeviceToken
CREATE TABLE `device_tokens` (
    `id`        VARCHAR(191) NOT NULL,
    `userId`    VARCHAR(191) NOT NULL,
    `token`     VARCHAR(500) NOT NULL,
    `platform`  VARCHAR(20) NOT NULL DEFAULT 'android',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `device_tokens_userId_token_key`(`userId`, `token`),
    INDEX `device_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `device_tokens` ADD CONSTRAINT `device_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
