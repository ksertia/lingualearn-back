-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `accountType` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `username` VARCHAR(100) NULL,
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
    `accountLabel` VARCHAR(100) NULL,
    `birthDate` DATETIME(3) NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `avatarColor` VARCHAR(7) NULL,
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Europe/Paris',
    `preferredLanguage` VARCHAR(10) NOT NULL DEFAULT 'fr',
    `gender` VARCHAR(20) NULL,
    `bio` TEXT NULL,
    `location` VARCHAR(100) NULL,
    `websiteUrl` VARCHAR(500) NULL,
    `socialLinks` JSON NULL,
    `customFields` JSON NULL,
    `settings` JSON NULL,
    `isLearningProfile` BOOLEAN NOT NULL DEFAULT false,
    `learningPreferences` JSON NULL,
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
CREATE TABLE `sub_account_management` (
    `id` VARCHAR(191) NOT NULL,
    `parentUserId` VARCHAR(191) NOT NULL,
    `subAccountId` VARCHAR(191) NOT NULL,
    `relationshipType` VARCHAR(30) NOT NULL DEFAULT 'family',
    `permissions` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `removedAt` DATETIME(3) NULL,
    `settings` JSON NULL,

    UNIQUE INDEX `sub_account_management_parentUserId_subAccountId_key`(`parentUserId`, `subAccountId`),
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
    `allowedDays` JSON NULL,
    `contentFilters` JSON NULL,
    `gameTimeLimitMinutes` INTEGER NOT NULL DEFAULT 60,
    `canPurchase` BOOLEAN NOT NULL DEFAULT false,
    `spendingLimitCoins` INTEGER NOT NULL DEFAULT 0,
    `spendingLimitGems` INTEGER NOT NULL DEFAULT 0,
    `notificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `progressReportsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `reportFrequency` VARCHAR(20) NOT NULL DEFAULT 'weekly',
    `learningGoals` JSON NULL,
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
    `maxDevices` INTEGER NOT NULL DEFAULT 1,
    `hasOfflineAccess` BOOLEAN NOT NULL DEFAULT false,
    `hasPremiumContent` BOOLEAN NOT NULL DEFAULT false,
    `hasAnalyticsDashboard` BOOLEAN NOT NULL DEFAULT false,
    `hasProgressReports` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
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
    `stripeSubscriptionId` VARCHAR(255) NULL,
    `stripeCustomerId` VARCHAR(255) NULL,
    `includesSubAccounts` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscriptions_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `languages` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `nativeName` VARCHAR(100) NULL,
    `flagEmoji` VARCHAR(10) NULL,
    `iconUrl` VARCHAR(500) NULL,
    `colorCode` VARCHAR(7) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `languages_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `levels` (
    `id` VARCHAR(191) NOT NULL,
    `languageId` VARCHAR(191) NOT NULL,
    `levelCode` VARCHAR(20) NOT NULL,
    `levelName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `bannerUrl` VARCHAR(500) NULL,
    `colorCode` VARCHAR(7) NULL,
    `sortOrder` INTEGER NOT NULL,
    `minAge` INTEGER NULL,
    `maxAge` INTEGER NULL,
    `estimatedDurationWeeks` INTEGER NULL,
    `requiredForNextId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `levels_languageId_levelCode_key`(`languageId`, `levelCode`),
    UNIQUE INDEX `levels_languageId_sortOrder_key`(`languageId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tracks` (
    `id` VARCHAR(191) NOT NULL,
    `levelId` VARCHAR(191) NOT NULL,
    `trackCode` VARCHAR(5) NOT NULL,
    `trackName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `colorCode` VARCHAR(7) NULL,
    `sortOrder` INTEGER NOT NULL,
    `difficulty` VARCHAR(20) NOT NULL DEFAULT 'medium',
    `estimatedDurationHours` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tracks_levelId_trackCode_key`(`levelId`, `trackCode`),
    UNIQUE INDEX `tracks_levelId_sortOrder_key`(`levelId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `id` VARCHAR(191) NOT NULL,
    `trackId` VARCHAR(191) NOT NULL,
    `courseNumber` INTEGER NOT NULL,
    `courseCode` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `thumbnailUrl` VARCHAR(500) NULL,
    `videoPreviewUrl` VARCHAR(500) NULL,
    `estimatedDurationMinutes` INTEGER NOT NULL DEFAULT 60,
    `difficultyLevel` VARCHAR(20) NOT NULL DEFAULT 'beginner',
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `courses_courseCode_key`(`courseCode`),
    UNIQUE INDEX `courses_trackId_courseNumber_key`(`trackId`, `courseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lessons` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `lessonNumber` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `contentType` VARCHAR(30) NOT NULL,
    `contentUrl` VARCHAR(500) NULL,
    `contentText` TEXT NULL,
    `interactiveData` JSON NULL,
    `estimatedDurationMinutes` INTEGER NOT NULL DEFAULT 15,
    `isFreePreview` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lessons_courseId_lessonNumber_key`(`courseId`, `lessonNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exercises` (
    `id` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `exerciseType` VARCHAR(30) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `instructions` TEXT NULL,
    `content` JSON NOT NULL,
    `correctAnswers` JSON NULL,
    `hints` JSON NULL,
    `points` INTEGER NOT NULL DEFAULT 10,
    `xpReward` INTEGER NOT NULL DEFAULT 10,
    `coinReward` INTEGER NOT NULL DEFAULT 5,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `timeLimitSeconds` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `exercises_lessonId_sortOrder_idx`(`lessonId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_categories` (
    `id` VARCHAR(191) NOT NULL,
    `categoryCode` VARCHAR(50) NOT NULL,
    `categoryName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `colorCode` VARCHAR(7) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `game_categories_categoryCode_key`(`categoryCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `educational_games` (
    `id` VARCHAR(191) NOT NULL,
    `gameCode` VARCHAR(50) NOT NULL,
    `gameName` VARCHAR(100) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `bannerUrl` VARCHAR(500) NULL,
    `minAge` INTEGER NULL,
    `maxAge` INTEGER NULL,
    `minPlayers` INTEGER NOT NULL DEFAULT 1,
    `maxPlayers` INTEGER NOT NULL DEFAULT 1,
    `estimatedDurationMinutes` INTEGER NULL,
    `learningObjectives` JSON NULL,
    `skillsDeveloped` JSON NULL,
    `difficultyLevel` VARCHAR(20) NOT NULL DEFAULT 'easy',
    `gameConfig` JSON NULL,
    `isMultiplayer` BOOLEAN NOT NULL DEFAULT false,
    `isCompetitive` BOOLEAN NOT NULL DEFAULT false,
    `requiresInternet` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `educational_games_gameCode_key`(`gameCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `gameId` VARCHAR(191) NOT NULL,
    `sessionCode` VARCHAR(50) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `score` INTEGER NOT NULL DEFAULT 0,
    `maxScore` INTEGER NULL,
    `accuracy` DECIMAL(5, 2) NULL,
    `timeSpentSeconds` INTEGER NULL,
    `movesCount` INTEGER NULL,
    `correctMoves` INTEGER NULL,
    `incorrectMoves` INTEGER NULL,
    `xpEarned` INTEGER NOT NULL DEFAULT 0,
    `coinsEarned` INTEGER NOT NULL DEFAULT 0,
    `gameData` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `game_sessions_sessionCode_key`(`sessionCode`),
    INDEX `game_sessions_userId_gameId_startedAt_idx`(`userId`, `gameId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_language_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `languageId` VARCHAR(191) NOT NULL,
    `currentLevelId` VARCHAR(191) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'not_started',
    `overallProgress` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `totalXp` INTEGER NOT NULL DEFAULT 0,
    `totalTimeMinutes` INTEGER NOT NULL DEFAULT 0,
    `lastAccessedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_language_progress_userId_languageId_key`(`userId`, `languageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_level_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `levelId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'locked',
    `unlockedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `currentTrackId` VARCHAR(191) NULL,
    `totalXp` INTEGER NOT NULL DEFAULT 0,
    `timeSpentMinutes` INTEGER NOT NULL DEFAULT 0,
    `lastAccessedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_level_progress_userId_levelId_key`(`userId`, `levelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_track_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `trackId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'locked',
    `unlockedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `currentCourseNumber` INTEGER NOT NULL DEFAULT 1,
    `totalXp` INTEGER NOT NULL DEFAULT 0,
    `timeSpentMinutes` INTEGER NOT NULL DEFAULT 0,
    `lastAccessedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_track_progress_userId_trackId_key`(`userId`, `trackId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_course_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'locked',
    `unlockedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.0,
    `currentLessonNumber` INTEGER NOT NULL DEFAULT 1,
    `totalXp` INTEGER NOT NULL DEFAULT 0,
    `timeSpentMinutes` INTEGER NOT NULL DEFAULT 0,
    `score` DECIMAL(5, 2) NULL,
    `attemptsCount` INTEGER NOT NULL DEFAULT 0,
    `bestScore` DECIMAL(5, 2) NULL,
    `lastAccessedAt` DATETIME(3) NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_course_progress_userId_courseId_key`(`userId`, `courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_lesson_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lessonId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'not_started',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `timeSpentSeconds` INTEGER NOT NULL DEFAULT 0,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completionDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_lesson_progress_userId_lessonId_key`(`userId`, `lessonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_exercise_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exerciseId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `score` DECIMAL(5, 2) NULL,
    `pointsEarned` INTEGER NOT NULL DEFAULT 0,
    `xpEarned` INTEGER NOT NULL DEFAULT 0,
    `coinsEarned` INTEGER NOT NULL DEFAULT 0,
    `answers` JSON NULL,
    `timeSpentSeconds` INTEGER NULL,
    `isCorrect` BOOLEAN NULL,
    `feedback` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_exercise_attempts_userId_exerciseId_attemptNumber_key`(`userId`, `exerciseId`, `attemptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificates` (
    `id` VARCHAR(191) NOT NULL,
    `levelId` VARCHAR(191) NOT NULL,
    `trackId` VARCHAR(191) NULL,
    `certCode` VARCHAR(50) NOT NULL,
    `certName` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `bannerUrl` VARCHAR(500) NULL,
    `requirements` JSON NOT NULL,
    `validityDays` INTEGER NULL,
    `unlocksNextLevel` BOOLEAN NOT NULL DEFAULT true,
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
    `awardedById` VARCHAR(191) NULL,
    `downloadUrl` VARCHAR(500) NULL,
    `qrCodeUrl` VARCHAR(500) NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_certificates_certificateNumber_key`(`certificateNumber`),
    UNIQUE INDEX `user_certificates_userId_certificateId_key`(`userId`, `certificateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `xp_levels` (
    `id` VARCHAR(191) NOT NULL,
    `levelNumber` INTEGER NOT NULL,
    `levelName` VARCHAR(100) NOT NULL,
    `xpRequired` BIGINT NOT NULL,
    `badgeUrl` VARCHAR(500) NULL,
    `iconUrl` VARCHAR(500) NULL,
    `colorCode` VARCHAR(7) NULL,
    `rewards` JSON NULL,
    `unlocksFeatures` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `xp_levels_levelNumber_key`(`levelNumber`),
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
    `unlockedIconUrl` VARCHAR(500) NULL,
    `colorCode` VARCHAR(7) NULL,
    `rarity` VARCHAR(20) NOT NULL DEFAULT 'common',
    `criteria` JSON NOT NULL,
    `xpReward` INTEGER NOT NULL DEFAULT 50,
    `coinReward` INTEGER NOT NULL DEFAULT 100,
    `displayOrder` INTEGER NULL,
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
    `progressData` JSON NULL,
    `timesUnlocked` INTEGER NOT NULL DEFAULT 1,
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `displayedOnProfile` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_badges_userId_badgeId_key`(`userId`, `badgeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_challenges` (
    `id` VARCHAR(191) NOT NULL,
    `challengeCode` VARCHAR(50) NOT NULL,
    `challengeName` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `challengeType` VARCHAR(30) NULL,
    `objectives` JSON NOT NULL,
    `rewards` JSON NULL,
    `difficulty` VARCHAR(20) NOT NULL DEFAULT 'easy',
    `requiredLevel` INTEGER NOT NULL DEFAULT 1,
    `availableDays` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_challenges_challengeCode_key`(`challengeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_daily_challenges` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `challengeId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `progressData` JSON NULL,
    `objectivesCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalObjectives` INTEGER NULL,
    `completedAt` DATETIME(3) NULL,
    `xpEarned` INTEGER NULL,
    `coinsEarned` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_daily_challenges_userId_challengeId_date_key`(`userId`, `challengeId`, `date`),
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
    `totalGamesPlayed` INTEGER NOT NULL DEFAULT 0,
    `totalExercisesCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalLessonsCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalCoursesCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalTracksCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalLevelsCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalCertificatesEarned` INTEGER NOT NULL DEFAULT 0,
    `totalBadgesEarned` INTEGER NOT NULL DEFAULT 0,
    `currentXpLevel` INTEGER NOT NULL DEFAULT 1,
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
    `gameMinutes` INTEGER NOT NULL DEFAULT 0,
    `lessonsCompleted` INTEGER NOT NULL DEFAULT 0,
    `exercisesCompleted` INTEGER NOT NULL DEFAULT 0,
    `gamesPlayed` INTEGER NOT NULL DEFAULT 0,
    `challengesCompleted` INTEGER NOT NULL DEFAULT 0,
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
    `totalGameMinutes` INTEGER NULL,
    `lessonsCompleted` INTEGER NULL,
    `exercisesCompleted` INTEGER NULL,
    `gamesPlayed` INTEGER NULL,
    `challengesCompleted` INTEGER NULL,
    `xpEarned` INTEGER NULL,
    `coinsEarned` INTEGER NULL,
    `badgesEarned` INTEGER NULL,
    `certificatesEarned` INTEGER NULL,
    `streakInfo` JSON NULL,
    `timeLimitsRespected` BOOLEAN NULL,
    `isViewed` BOOLEAN NOT NULL DEFAULT false,
    `viewedAt` DATETIME(3) NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `account_reports_parentUserId_periodStart_periodEnd_idx`(`parentUserId`, `periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtual_shop_categories` (
    `id` VARCHAR(191) NOT NULL,
    `categoryCode` VARCHAR(50) NOT NULL,
    `categoryName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `iconUrl` VARCHAR(500) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `virtual_shop_categories_categoryCode_key`(`categoryCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtual_shop_items` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `itemCode` VARCHAR(50) NOT NULL,
    `itemName` VARCHAR(200) NOT NULL,
    `itemType` VARCHAR(30) NULL,
    `description` TEXT NULL,
    `previewUrl` VARCHAR(500) NULL,
    `iconUrl` VARCHAR(500) NULL,
    `priceCoins` INTEGER NULL,
    `priceGems` INTEGER NULL,
    `rarity` VARCHAR(20) NOT NULL DEFAULT 'common',
    `requiresLevel` INTEGER NOT NULL DEFAULT 1,
    `requiresCertId` VARCHAR(191) NULL,
    `stockQuantity` INTEGER NULL,
    `isLimited` BOOLEAN NOT NULL DEFAULT false,
    `availableFrom` DATETIME(3) NULL,
    `availableUntil` DATETIME(3) NULL,
    `purchaseLimit` INTEGER NULL,
    `itemData` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `virtual_shop_items_itemCode_key`(`itemCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `purchaseType` VARCHAR(20) NOT NULL DEFAULT 'coins',
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `totalPriceCoins` INTEGER NULL,
    `totalPriceGems` INTEGER NULL,
    `transactionId` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_purchases_userId_itemId_purchasedAt_idx`(`userId`, `itemId`, `purchasedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_inventory` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `isEquipped` BOOLEAN NOT NULL DEFAULT false,
    `equippedData` JSON NULL,
    `expiresAt` DATETIME(3) NULL,
    `purchasedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_inventory_userId_itemId_key`(`userId`, `itemId`),
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
    `actionLabel` VARCHAR(100) NULL,
    `data` JSON NULL,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `channels` JSON NULL,
    `isSent` BOOLEAN NOT NULL DEFAULT false,
    `sentAt` DATETIME(3) NULL,
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
    `amountGems` INTEGER NULL,
    `description` VARCHAR(500) NULL,
    `referenceType` VARCHAR(50) NULL,
    `referenceId` VARCHAR(191) NULL,
    `balanceCoinsAfter` INTEGER NULL,
    `balanceGemsAfter` INTEGER NULL,
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
ALTER TABLE `sub_account_management` ADD CONSTRAINT `sub_account_management_parentUserId_fkey` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_account_management` ADD CONSTRAINT `sub_account_management_subAccountId_fkey` FOREIGN KEY (`subAccountId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_account_controls` ADD CONSTRAINT `sub_account_controls_parentUserId_fkey` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_account_controls` ADD CONSTRAINT `sub_account_controls_subAccountId_fkey` FOREIGN KEY (`subAccountId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `levels` ADD CONSTRAINT `levels_languageId_fkey` FOREIGN KEY (`languageId`) REFERENCES `languages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `levels` ADD CONSTRAINT `levels_requiredForNextId_fkey` FOREIGN KEY (`requiredForNextId`) REFERENCES `levels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tracks` ADD CONSTRAINT `tracks_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `tracks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `educational_games` ADD CONSTRAINT `educational_games_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `game_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_sessions` ADD CONSTRAINT `game_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_sessions` ADD CONSTRAINT `game_sessions_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `educational_games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_language_progress` ADD CONSTRAINT `user_language_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_language_progress` ADD CONSTRAINT `user_language_progress_languageId_fkey` FOREIGN KEY (`languageId`) REFERENCES `languages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_level_progress` ADD CONSTRAINT `user_level_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_level_progress` ADD CONSTRAINT `user_level_progress_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_track_progress` ADD CONSTRAINT `user_track_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_track_progress` ADD CONSTRAINT `user_track_progress_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `tracks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_course_progress` ADD CONSTRAINT `user_course_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_course_progress` ADD CONSTRAINT `user_course_progress_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_lesson_progress` ADD CONSTRAINT `user_lesson_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_lesson_progress` ADD CONSTRAINT `user_lesson_progress_lessonId_fkey` FOREIGN KEY (`lessonId`) REFERENCES `lessons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_exercise_attempts` ADD CONSTRAINT `user_exercise_attempts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_exercise_attempts` ADD CONSTRAINT `user_exercise_attempts_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_trackId_fkey` FOREIGN KEY (`trackId`) REFERENCES `tracks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_certificates` ADD CONSTRAINT `user_certificates_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_certificates` ADD CONSTRAINT `user_certificates_certificateId_fkey` FOREIGN KEY (`certificateId`) REFERENCES `certificates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_certificates` ADD CONSTRAINT `user_certificates_awardedById_fkey` FOREIGN KEY (`awardedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_badges` ADD CONSTRAINT `user_badges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_badges` ADD CONSTRAINT `user_badges_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `badges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_daily_challenges` ADD CONSTRAINT `user_daily_challenges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_daily_challenges` ADD CONSTRAINT `user_daily_challenges_challengeId_fkey` FOREIGN KEY (`challengeId`) REFERENCES `daily_challenges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_stats` ADD CONSTRAINT `user_stats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_daily_activity` ADD CONSTRAINT `user_daily_activity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_reports` ADD CONSTRAINT `account_reports_parentUserId_fkey` FOREIGN KEY (`parentUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_reports` ADD CONSTRAINT `account_reports_subAccountId_fkey` FOREIGN KEY (`subAccountId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_shop_items` ADD CONSTRAINT `virtual_shop_items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `virtual_shop_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtual_shop_items` ADD CONSTRAINT `virtual_shop_items_requiresCertId_fkey` FOREIGN KEY (`requiresCertId`) REFERENCES `certificates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_purchases` ADD CONSTRAINT `user_purchases_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_purchases` ADD CONSTRAINT `user_purchases_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `virtual_shop_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_inventory` ADD CONSTRAINT `user_inventory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_inventory` ADD CONSTRAINT `user_inventory_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `virtual_shop_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
