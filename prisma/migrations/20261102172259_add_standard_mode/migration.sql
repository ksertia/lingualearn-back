-- Mode Standard : catalogue de sessions courtes par langue, servies une à une
-- dans l'ordre (curseur StandardProgress), avec enregistrement idempotent
-- (requestId) de chaque session terminée.

CREATE TABLE `standard_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `languageId` VARCHAR(191) NOT NULL,
    `position` INT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `estimatedMinutes` INT NOT NULL DEFAULT 3,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `reviewedBy` VARCHAR(100) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `standard_sessions_languageId_position_key`(`languageId`, `position`),
    INDEX `standard_sessions_languageId_isPublished_position_idx`(`languageId`, `isPublished`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `standard_items` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `position` INT NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `term` VARCHAR(255) NULL,
    `translation` VARCHAR(255) NULL,
    `example` VARCHAR(500) NULL,
    `exampleTranslation` VARCHAR(500) NULL,
    `audioUrl` VARCHAR(500) NULL,
    `question` VARCHAR(500) NULL,
    `options` JSON NULL,
    `answerIndex` INT NULL,
    `sentence` VARCHAR(500) NULL,
    `answerWords` JSON NULL,
    `distractors` JSON NULL,
    `fromFrench` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `standard_items_sessionId_position_key`(`sessionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `standard_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `languageId` VARCHAR(191) NOT NULL,
    `nextPosition` INT NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `standard_progress_userId_languageId_key`(`userId`, `languageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `standard_session_results` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `languageId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(100) NOT NULL,
    `correctAnswers` INT NOT NULL,
    `exerciseCount` INT NOT NULL,
    `stars` INT NOT NULL,
    `durationSeconds` INT NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `standard_session_results_requestId_key`(`requestId`),
    INDEX `standard_session_results_userId_languageId_idx`(`userId`, `languageId`),
    INDEX `standard_session_results_sessionId_idx`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `standard_sessions` ADD CONSTRAINT `standard_sessions_languageId_fkey` FOREIGN KEY (`languageId`) REFERENCES `languages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `standard_items` ADD CONSTRAINT `standard_items_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `standard_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `standard_progress` ADD CONSTRAINT `standard_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `standard_progress` ADD CONSTRAINT `standard_progress_languageId_fkey` FOREIGN KEY (`languageId`) REFERENCES `languages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `standard_session_results` ADD CONSTRAINT `standard_session_results_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `standard_session_results` ADD CONSTRAINT `standard_session_results_languageId_fkey` FOREIGN KEY (`languageId`) REFERENCES `languages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `standard_session_results` ADD CONSTRAINT `standard_session_results_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `standard_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
