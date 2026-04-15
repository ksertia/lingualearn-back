-- CreateTable
CREATE TABLE `user_exercise_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exerciseId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'not_started',
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `score` DECIMAL(5, 2) NULL,
    `completedAt` DATETIME(3) NULL,
    `unlockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_exercise_progress_exerciseId_status_idx`(`exerciseId`, `status`),
    INDEX `user_exercise_progress_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `user_exercise_progress_userId_exerciseId_key`(`userId`, `exerciseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_quiz_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `quizId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'not_started',
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `score` DECIMAL(5, 2) NULL,
    `completedAt` DATETIME(3) NULL,
    `unlockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_quiz_progress_quizId_status_idx`(`quizId`, `status`),
    INDEX `user_quiz_progress_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `user_quiz_progress_userId_quizId_key`(`userId`, `quizId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_exercise_progress` ADD CONSTRAINT `user_exercise_progress_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_exercise_progress` ADD CONSTRAINT `user_exercise_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_quiz_progress` ADD CONSTRAINT `user_quiz_progress_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_quiz_progress` ADD CONSTRAINT `user_quiz_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
