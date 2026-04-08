-- CreateTable
CREATE TABLE `discover_lessons` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `languageCode` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL DEFAULT 'intermediate',
    `thumbnailUrl` VARCHAR(191) NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `discover_lessons_languageCode_level_key`(`languageCode`, `level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discover_sections` (
    `id` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `discover_sections_lessonId_order_key`(`lessonId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discover_exercises` (
    `id` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `mediaUrl` VARCHAR(191) NULL,
    `text` VARCHAR(191) NULL,
    `translation` VARCHAR(191) NULL,
    `duration` INTEGER NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `question` VARCHAR(191) NULL,
    `choices` JSON NULL,
    `correctAnswer` VARCHAR(191) NULL,
    `imageUrl` VARCHAR(191) NULL,
    `imageAlt` VARCHAR(191) NULL,
    `dragItems` JSON NULL,
    `dropZones` JSON NULL,
    `hint` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discover_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `totalScore` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastActivity` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `discover_sessions_createdAt_idx`(`createdAt`),
    INDEX `discover_sessions_lastActivity_idx`(`lastActivity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discover_session_exercises` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `exerciseId` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `maxScore` INTEGER NOT NULL DEFAULT 0,
    `percentage` DOUBLE NOT NULL DEFAULT 0,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `discover_session_exercises_sessionId_idx`(`sessionId`),
    UNIQUE INDEX `discover_session_exercises_sessionId_exerciseId_key`(`sessionId`, `exerciseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `discover_lessons` ADD CONSTRAINT `discover_lessons_languageCode_fkey` FOREIGN KEY (`languageCode`) REFERENCES `languages`(`code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discover_sections` ADD CONSTRAINT `discover_sections_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `discover_lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discover_exercises` ADD CONSTRAINT `discover_exercises_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `discover_sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discover_session_exercises` ADD CONSTRAINT `discover_session_exercises_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `discover_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
