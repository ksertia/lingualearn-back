-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `accountType` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `username` VARCHAR(100) NULL,
    `firstLogin` BOOLEAN NOT NULL DEFAULT true,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `subscriptionId` VARCHAR(191) NULL,
    `subscriptionEndsAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastLogin` DATETIME(3) NULL,
    `lastActive` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_parentId_idx`(`parentId`),
    INDEX `users_accountType_idx`(`accountType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(100) NULL,
    `birthDate` DATETIME(3) NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Europe/Paris',
    `preferredLanguage` VARCHAR(10) NOT NULL DEFAULT 'fr',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` TEXT NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` TEXT NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_codes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `contactType` VARCHAR(191) NOT NULL,
    `contactValue` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `deviceInfo` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `lastActivity` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_account_controls` (
    `id` VARCHAR(191) NOT NULL,
    `parentUserId` VARCHAR(191) NOT NULL,
    `subAccountId` VARCHAR(191) NOT NULL,
    `dailyTimeLimitMinutes` INTEGER NOT NULL DEFAULT 120,
    `weeklyTimeLimitMinutes` INTEGER NOT NULL DEFAULT 840,
    `bedtimeStart` VARCHAR(10) NOT NULL DEFAULT '21:00',
    `bedtimeEnd` VARCHAR(10) NOT NULL DEFAULT '07:00',
    `canPurchase` BOOLEAN NOT NULL DEFAULT false,
    `spendingLimitCoins` INTEGER NOT NULL DEFAULT 0,
    `notificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `progressReportsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `reportFrequency` VARCHAR(20) NOT NULL DEFAULT 'weekly',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sub_account_controls_parentUserId_subAccountId_key`(`parentUserId`, `subAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` VARCHAR(191) NOT NULL,
    `planCode` VARCHAR(50) NOT NULL,
    `planName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `priceMonthly` DECIMAL(10, 2) NULL,
    `priceYearly` DECIMAL(10, 2) NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'EUR',
    `features` JSON NOT NULL,
    `maxSubAccounts` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscription_plans_planCode_key`(`planCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `billingCycle` VARCHAR(20) NOT NULL DEFAULT 'monthly',
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `cancelAtPeriodEnd` BOOLEAN NOT NULL DEFAULT false,
    `canceledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscriptions_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `learning_paths` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `levels` (
    `id` VARCHAR(191) NOT NULL,
    `learningPathId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `steps` (
    `id` VARCHAR(191) NOT NULL,
    `levelId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `stepNumber` INTEGER NOT NULL,
    `stepCode` VARCHAR(50) NULL,
    `thumbnailUrl` VARCHAR(500) NULL,
    `iconUrl` VARCHAR(500) NULL,
    `estimatedDurationHours` INTEGER NULL DEFAULT 1,
    `difficultyLevel` VARCHAR(20) NOT NULL DEFAULT 'beginner',
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `steps_levelId_stepNumber_key`(`levelId`, `stepNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lessons` (
    `id` VARCHAR(191) NOT NULL,
    `stepId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `lessonNumber` INTEGER NOT NULL,
    `contentType` VARCHAR(30) NOT NULL,
    `contentUrl` VARCHAR(500) NULL,
    `contentText` TEXT NULL,
    `interactiveData` JSON NULL,
    `estimatedDurationMinutes` INTEGER NOT NULL DEFAULT 15,
    `isFreePreview` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lessons_stepId_lessonNumber_key`(`stepId`, `lessonNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercises` (
    `id` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `exerciseType` VARCHAR(30) NOT NULL,
    `instructions` TEXT NULL,
    `content` JSON NOT NULL,
    `correctAnswers` JSON NULL,
    `hints` JSON NULL,
    `explanation` TEXT NULL,
    `points` INTEGER NOT NULL DEFAULT 10,
    `xpReward` INTEGER NOT NULL DEFAULT 10,
    `coinReward` INTEGER NOT NULL DEFAULT 5,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `timeLimitSeconds` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `exercises_lessonId_sortOrder_idx`(`lessonId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `step_quizzes` (
    `id` VARCHAR(191) NOT NULL,
    `stepId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `questions` JSON NOT NULL,
    `passingScore` INTEGER NOT NULL DEFAULT 70,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `timeLimitMinutes` INTEGER NOT NULL DEFAULT 20,
    `xpReward` INTEGER NOT NULL DEFAULT 80,
    `coinReward` INTEGER NOT NULL DEFAULT 40,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `step_quizzes_stepId_key`(`stepId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_exams` (
    `id` VARCHAR(191) NOT NULL,
    `levelId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `sections` JSON NOT NULL,
    `passingScore` INTEGER NOT NULL DEFAULT 75,
    `maxAttempts` INTEGER NOT NULL DEFAULT 2,
    `timeLimitMinutes` INTEGER NOT NULL DEFAULT 60,
    `xpReward` INTEGER NOT NULL DEFAULT 500,
    `coinReward` INTEGER NOT NULL DEFAULT 200,
    `unlocksCertificate` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `level_exams_levelId_key`(`levelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `final_exams` (
    `id` VARCHAR(191) NOT NULL,
    `learningPathId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `sections` JSON NOT NULL,
    `passingScore` INTEGER NOT NULL DEFAULT 80,
    `maxAttempts` INTEGER NOT NULL DEFAULT 1,
    `timeLimitMinutes` INTEGER NOT NULL DEFAULT 120,
    `xpReward` INTEGER NOT NULL DEFAULT 1000,
    `coinReward` INTEGER NOT NULL DEFAULT 500,
    `awardsCertificate` BOOLEAN NOT NULL DEFAULT true,
    `certificateId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `final_exams_learningPathId_key`(`learningPathId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quiz_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `quizType` VARCHAR(20) NOT NULL,
    `stepQuizId` VARCHAR(191) NULL,
    `levelExamId` VARCHAR(191) NULL,
    `finalExamId` VARCHAR(191) NULL,
    `attemptNumber` INTEGER NOT NULL,
    `score` DECIMAL(5, 2) NOT NULL,
    `answers` JSON NOT NULL,
    `timeSpentSeconds` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `passed` BOOLEAN NOT NULL,
    `feedback` TEXT NULL,
    `xpEarned` INTEGER NOT NULL DEFAULT 0,
    `coinsEarned` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `gradedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `quiz_attempts_userId_quizType_stepQuizId_attemptNumber_key`(`userId`, `quizType`, `stepQuizId`, `attemptNumber`),
    UNIQUE INDEX `quiz_attempts_userId_quizType_levelExamId_attemptNumber_key`(`userId`, `quizType`, `levelExamId`, `attemptNumber`),
    UNIQUE INDEX `quiz_attempts_userId_quizType_finalExamId_attemptNumber_key`(`userId`, `quizType`, `finalExamId`, `attemptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercise_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exerciseId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `answers` JSON NOT NULL,
    `score` DECIMAL(5, 2) NULL,
    `pointsEarned` INTEGER NOT NULL DEFAULT 0,
    `xpEarned` INTEGER NOT NULL DEFAULT 0,
    `coinsEarned` INTEGER NOT NULL DEFAULT 0,
    `timeSpentSeconds` INTEGER NULL,
    `isCorrect` BOOLEAN NULL,
    `feedback` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `exercise_attempts_userId_exerciseId_attemptNumber_key`(`userId`, `exerciseId`, `attemptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_learning_path_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `learningPathId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'not_started',
    `currentLevelId` VARCHAR(191) NULL,
    `overallProgress` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `totalXp` INTEGER NOT NULL DEFAULT 0,
    `totalTimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `finalExamScore` DECIMAL(5, 2) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `lastAccessedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_learning_path_progress_userId_learningPathId_key`(`userId`, `learningPathId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_level_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `levelId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'locked',
    `currentStepNumber` INTEGER NOT NULL DEFAULT 1,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `totalXp` INTEGER NOT NULL DEFAULT 0,
    `timeSpentMinutes` INTEGER NOT NULL DEFAULT 0,
    `levelExamScore` DECIMAL(5, 2) NULL,
    `unlockedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `lastAccessedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_level_progress_userId_levelId_key`(`userId`, `levelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_step_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `stepId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'locked',
    `currentLessonNumber` INTEGER NOT NULL DEFAULT 1,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `totalXp` INTEGER NOT NULL DEFAULT 0,
    `timeSpentMinutes` INTEGER NOT NULL DEFAULT 0,
    `quizScore` DECIMAL(5, 2) NULL,
    `unlockedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `lastAccessedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_step_progress_userId_stepId_key`(`userId`, `stepId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_lesson_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'not_started',
    `progress` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_lesson_progress_userId_lessonId_key`(`userId`, `lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificates` (
    `id` VARCHAR(191) NOT NULL,
    `learningPathId` VARCHAR(191) NULL,
    `certCode` VARCHAR(50) NOT NULL,
    `certName` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `bannerUrl` VARCHAR(500) NULL,
    `requirements` JSON NOT NULL,
    `validityDays` INTEGER NULL,
    `xpReward` INTEGER NOT NULL DEFAULT 500,
    `coinReward` INTEGER NOT NULL DEFAULT 200,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `certificates_certCode_key`(`certCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_certificates` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `certificateId` VARCHAR(191) NOT NULL,
    `certificateNumber` VARCHAR(100) NOT NULL,
    `issueDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NULL,
    `score` DECIMAL(5, 2) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `downloadUrl` VARCHAR(500) NULL,
    `qrCodeUrl` VARCHAR(500) NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_certificates_certificateNumber_key`(`certificateNumber`),
    UNIQUE INDEX `user_certificates_userId_certificateId_key`(`userId`, `certificateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `badges` (
    `id` VARCHAR(191) NOT NULL,
    `badgeCode` VARCHAR(50) NOT NULL,
    `badgeName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(30) NULL,
    `iconUrl` VARCHAR(500) NULL,
    `colorCode` VARCHAR(7) NULL,
    `rarity` VARCHAR(20) NOT NULL DEFAULT 'common',
    `criteria` JSON NOT NULL,
    `xpReward` INTEGER NOT NULL DEFAULT 50,
    `coinReward` INTEGER NOT NULL DEFAULT 100,
    `isSecret` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `badges_badgeCode_key`(`badgeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_badges` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `badgeId` VARCHAR(191) NOT NULL,
    `unlockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_badges_userId_badgeId_key`(`userId`, `badgeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_stats` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `totalXp` BIGINT NOT NULL DEFAULT 0,
    `totalCoins` INTEGER NOT NULL DEFAULT 0,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `longestStreak` INTEGER NOT NULL DEFAULT 0,
    `totalStudyMinutes` INTEGER NOT NULL DEFAULT 0,
    `totalExercisesCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalLessonsCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalStepsCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalLevelsCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalCertificatesEarned` INTEGER NOT NULL DEFAULT 0,
    `totalBadgesEarned` INTEGER NOT NULL DEFAULT 0,
    `accuracyRate` DECIMAL(5, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_stats_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_daily_activity` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `activityDate` DATETIME(3) NOT NULL,
    `studyMinutes` INTEGER NOT NULL DEFAULT 0,
    `lessonsCompleted` INTEGER NOT NULL DEFAULT 0,
    `exercisesCompleted` INTEGER NOT NULL DEFAULT 0,
    `stepsCompleted` INTEGER NOT NULL DEFAULT 0,
    `xpEarned` INTEGER NOT NULL DEFAULT 0,
    `coinsEarned` INTEGER NOT NULL DEFAULT 0,
    `badgesEarned` INTEGER NOT NULL DEFAULT 0,
    `streakMaintained` BOOLEAN NULL,
    `firstActivityAt` DATETIME(3) NULL,
    `lastActivityAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_daily_activity_userId_activityDate_key`(`userId`, `activityDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_reports` (
    `id` VARCHAR(191) NOT NULL,
    `parentUserId` VARCHAR(191) NOT NULL,
    `subAccountId` VARCHAR(191) NOT NULL,
    `reportType` VARCHAR(30) NOT NULL DEFAULT 'weekly',
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `summary` JSON NOT NULL,
    `achievements` JSON NULL,
    `areasForImprovement` JSON NULL,
    `recommendations` JSON NULL,
    `totalStudyMinutes` INTEGER NULL,
    `lessonsCompleted` INTEGER NULL,
    `exercisesCompleted` INTEGER NULL,
    `stepsCompleted` INTEGER NULL,
    `levelsCompleted` INTEGER NULL,
    `xpEarned` INTEGER NULL,
    `coinsEarned` INTEGER NULL,
    `badgesEarned` INTEGER NULL,
    `certificatesEarned` INTEGER NULL,
    `isViewed` BOOLEAN NOT NULL DEFAULT false,
    `viewedAt` DATETIME(3) NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `account_reports_parentUserId_periodStart_periodEnd_idx`(`parentUserId`, `periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `notificationType` VARCHAR(30) NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `actionUrl` VARCHAR(500) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `transactionType` VARCHAR(30) NOT NULL,
    `amountCoins` INTEGER NULL,
    `description` VARCHAR(500) NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` VARCHAR(191) NULL,
    `balanceCoinsAfter` INTEGER NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transactions_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_codes` ADD CONSTRAINT `verification_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_attempts` ADD CONSTRAINT `login_attempts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_account_controls` ADD CONSTRAINT `sub_account_controls_parentUserId_fkey` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_account_controls` ADD CONSTRAINT `sub_account_controls_subAccountId_fkey` FOREIGN KEY (`subAccountId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `levels` ADD CONSTRAINT `levels_learningPathId_fkey` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `steps` ADD CONSTRAINT `steps_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `step_quizzes` ADD CONSTRAINT `step_quizzes_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `level_exams` ADD CONSTRAINT `level_exams_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `final_exams` ADD CONSTRAINT `final_exams_learningPathId_fkey` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `final_exams` ADD CONSTRAINT `final_exams_certificateId_fkey` FOREIGN KEY (`certificateId`) REFERENCES `certificates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_stepQuizId_fkey` FOREIGN KEY (`stepQuizId`) REFERENCES `step_quizzes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_levelExamId_fkey` FOREIGN KEY (`levelExamId`) REFERENCES `level_exams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quiz_attempts` ADD CONSTRAINT `quiz_attempts_finalExamId_fkey` FOREIGN KEY (`finalExamId`) REFERENCES `final_exams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercise_attempts` ADD CONSTRAINT `exercise_attempts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercise_attempts` ADD CONSTRAINT `exercise_attempts_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_learning_path_progress` ADD CONSTRAINT `user_learning_path_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_learning_path_progress` ADD CONSTRAINT `user_learning_path_progress_learningPathId_fkey` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_learning_path_progress` ADD CONSTRAINT `user_learning_path_progress_currentLevelId_fkey` FOREIGN KEY (`currentLevelId`) REFERENCES `levels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_level_progress` ADD CONSTRAINT `user_level_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_level_progress` ADD CONSTRAINT `user_level_progress_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_step_progress` ADD CONSTRAINT `user_step_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_step_progress` ADD CONSTRAINT `user_step_progress_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_lesson_progress` ADD CONSTRAINT `user_lesson_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_lesson_progress` ADD CONSTRAINT `user_lesson_progress_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_learningPathId_fkey` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_certificates` ADD CONSTRAINT `user_certificates_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_certificates` ADD CONSTRAINT `user_certificates_certificateId_fkey` FOREIGN KEY (`certificateId`) REFERENCES `certificates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_badges` ADD CONSTRAINT `user_badges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_badges` ADD CONSTRAINT `user_badges_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `badges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_stats` ADD CONSTRAINT `user_stats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_daily_activity` ADD CONSTRAINT `user_daily_activity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_reports` ADD CONSTRAINT `account_reports_parentUserId_fkey` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_reports` ADD CONSTRAINT `account_reports_subAccountId_fkey` FOREIGN KEY (`subAccountId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
