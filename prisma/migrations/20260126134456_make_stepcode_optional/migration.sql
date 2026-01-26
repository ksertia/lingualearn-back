/*
  Warnings:

  - You are about to drop the column `challengesCompleted` on the `account_reports` table. All the data in the column will be lost.
  - You are about to drop the column `gamesPlayed` on the `account_reports` table. All the data in the column will be lost.
  - You are about to drop the column `streakInfo` on the `account_reports` table. All the data in the column will be lost.
  - You are about to drop the column `timeLimitsRespected` on the `account_reports` table. All the data in the column will be lost.
  - You are about to drop the column `totalGameMinutes` on the `account_reports` table. All the data in the column will be lost.
  - You are about to drop the column `displayOrder` on the `badges` table. All the data in the column will be lost.
  - You are about to drop the column `unlockedIconUrl` on the `badges` table. All the data in the column will be lost.
  - You are about to drop the column `levelId` on the `certificates` table. All the data in the column will be lost.
  - You are about to drop the column `trackId` on the `certificates` table. All the data in the column will be lost.
  - You are about to drop the column `unlocksNextLevel` on the `certificates` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `bannerUrl` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `colorCode` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDurationWeeks` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `iconUrl` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `languageId` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `levelCode` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `levelName` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `maxAge` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `minAge` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `requiredForNextId` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `levels` table. All the data in the column will be lost.
  - You are about to drop the column `actionLabel` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `channels` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `data` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `isSent` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `accountLabel` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `avatarColor` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `customFields` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `isLearningProfile` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `learningPreferences` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `settings` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `socialLinks` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `websiteUrl` on the `profiles` table. All the data in the column will be lost.
  - You are about to drop the column `allowedDays` on the `sub_account_controls` table. All the data in the column will be lost.
  - You are about to drop the column `contentFilters` on the `sub_account_controls` table. All the data in the column will be lost.
  - You are about to drop the column `gameTimeLimitMinutes` on the `sub_account_controls` table. All the data in the column will be lost.
  - You are about to drop the column `learningGoals` on the `sub_account_controls` table. All the data in the column will be lost.
  - You are about to drop the column `spendingLimitGems` on the `sub_account_controls` table. All the data in the column will be lost.
  - You are about to drop the column `hasAnalyticsDashboard` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `hasOfflineAccess` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `hasPremiumContent` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `hasProgressReports` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `maxDevices` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `subscription_plans` table. All the data in the column will be lost.
  - You are about to drop the column `includesSubAccounts` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `amountGems` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `balanceGemsAfter` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `displayedOnProfile` on the `user_badges` table. All the data in the column will be lost.
  - You are about to drop the column `progressData` on the `user_badges` table. All the data in the column will be lost.
  - You are about to drop the column `timesUnlocked` on the `user_badges` table. All the data in the column will be lost.
  - You are about to drop the column `awardedById` on the `user_certificates` table. All the data in the column will be lost.
  - You are about to drop the column `challengesCompleted` on the `user_daily_activity` table. All the data in the column will be lost.
  - You are about to drop the column `gameMinutes` on the `user_daily_activity` table. All the data in the column will be lost.
  - You are about to drop the column `gamesPlayed` on the `user_daily_activity` table. All the data in the column will be lost.
  - You are about to drop the column `completionDate` on the `user_lesson_progress` table. All the data in the column will be lost.
  - You are about to drop the column `isCompleted` on the `user_lesson_progress` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `user_lesson_progress` table. All the data in the column will be lost.
  - You are about to drop the column `timeSpentSeconds` on the `user_lesson_progress` table. All the data in the column will be lost.
  - You are about to drop the column `currentTrackId` on the `user_level_progress` table. All the data in the column will be lost.
  - You are about to drop the column `currentXpLevel` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the column `totalCoursesCompleted` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the column `totalGamesPlayed` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the column `totalTracksCompleted` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `daily_challenges` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `educational_games` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `game_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `game_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `languages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sub_account_management` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tracks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_course_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_daily_challenges` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_exercise_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_language_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_purchases` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_track_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `virtual_shop_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `virtual_shop_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `xp_levels` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stepId,lessonNumber]` on the table `lessons` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stepId` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `learningPathId` to the `levels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `levels` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `certificates` DROP FOREIGN KEY `certificates_levelId_fkey`;

-- DropForeignKey
ALTER TABLE `certificates` DROP FOREIGN KEY `certificates_trackId_fkey`;

-- DropForeignKey
ALTER TABLE `courses` DROP FOREIGN KEY `courses_trackId_fkey`;

-- DropForeignKey
ALTER TABLE `educational_games` DROP FOREIGN KEY `educational_games_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `game_sessions` DROP FOREIGN KEY `game_sessions_gameId_fkey`;

-- DropForeignKey
ALTER TABLE `game_sessions` DROP FOREIGN KEY `game_sessions_userId_fkey`;

-- DropForeignKey
ALTER TABLE `lessons` DROP FOREIGN KEY `lessons_courseId_fkey`;

-- DropForeignKey
ALTER TABLE `levels` DROP FOREIGN KEY `levels_languageId_fkey`;

-- DropForeignKey
ALTER TABLE `levels` DROP FOREIGN KEY `levels_requiredForNextId_fkey`;

-- DropForeignKey
ALTER TABLE `sub_account_management` DROP FOREIGN KEY `sub_account_management_parentUserId_fkey`;

-- DropForeignKey
ALTER TABLE `sub_account_management` DROP FOREIGN KEY `sub_account_management_subAccountId_fkey`;

-- DropForeignKey
ALTER TABLE `tracks` DROP FOREIGN KEY `tracks_levelId_fkey`;

-- DropForeignKey
ALTER TABLE `user_certificates` DROP FOREIGN KEY `user_certificates_awardedById_fkey`;

-- DropForeignKey
ALTER TABLE `user_course_progress` DROP FOREIGN KEY `user_course_progress_courseId_fkey`;

-- DropForeignKey
ALTER TABLE `user_course_progress` DROP FOREIGN KEY `user_course_progress_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_daily_challenges` DROP FOREIGN KEY `user_daily_challenges_challengeId_fkey`;

-- DropForeignKey
ALTER TABLE `user_daily_challenges` DROP FOREIGN KEY `user_daily_challenges_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_exercise_attempts` DROP FOREIGN KEY `user_exercise_attempts_exerciseId_fkey`;

-- DropForeignKey
ALTER TABLE `user_exercise_attempts` DROP FOREIGN KEY `user_exercise_attempts_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_inventory` DROP FOREIGN KEY `user_inventory_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `user_inventory` DROP FOREIGN KEY `user_inventory_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_language_progress` DROP FOREIGN KEY `user_language_progress_languageId_fkey`;

-- DropForeignKey
ALTER TABLE `user_language_progress` DROP FOREIGN KEY `user_language_progress_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_purchases` DROP FOREIGN KEY `user_purchases_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `user_purchases` DROP FOREIGN KEY `user_purchases_userId_fkey`;

-- DropForeignKey
ALTER TABLE `user_track_progress` DROP FOREIGN KEY `user_track_progress_trackId_fkey`;

-- DropForeignKey
ALTER TABLE `user_track_progress` DROP FOREIGN KEY `user_track_progress_userId_fkey`;

-- DropForeignKey
ALTER TABLE `virtual_shop_items` DROP FOREIGN KEY `virtual_shop_items_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `virtual_shop_items` DROP FOREIGN KEY `virtual_shop_items_requiresCertId_fkey`;

-- DropIndex
DROP INDEX `lessons_courseId_lessonNumber_key` ON `lessons`;

-- DropIndex
DROP INDEX `levels_languageId_levelCode_key` ON `levels`;

-- DropIndex
DROP INDEX `levels_languageId_sortOrder_key` ON `levels`;

-- AlterTable
ALTER TABLE `account_reports` DROP COLUMN `challengesCompleted`,
    DROP COLUMN `gamesPlayed`,
    DROP COLUMN `streakInfo`,
    DROP COLUMN `timeLimitsRespected`,
    DROP COLUMN `totalGameMinutes`,
    ADD COLUMN `levelsCompleted` INTEGER NULL,
    ADD COLUMN `stepsCompleted` INTEGER NULL;

-- AlterTable
ALTER TABLE `badges` DROP COLUMN `displayOrder`,
    DROP COLUMN `unlockedIconUrl`;

-- AlterTable
ALTER TABLE `certificates` DROP COLUMN `levelId`,
    DROP COLUMN `trackId`,
    DROP COLUMN `unlocksNextLevel`,
    ADD COLUMN `learningPathId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `exercises` ADD COLUMN `explanation` TEXT NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `lessons` DROP COLUMN `courseId`,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `stepId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `levels` DROP COLUMN `bannerUrl`,
    DROP COLUMN `colorCode`,
    DROP COLUMN `estimatedDurationWeeks`,
    DROP COLUMN `iconUrl`,
    DROP COLUMN `isActive`,
    DROP COLUMN `languageId`,
    DROP COLUMN `levelCode`,
    DROP COLUMN `levelName`,
    DROP COLUMN `maxAge`,
    DROP COLUMN `minAge`,
    DROP COLUMN `requiredForNextId`,
    DROP COLUMN `sortOrder`,
    ADD COLUMN `learningPathId` VARCHAR(191) NOT NULL,
    ADD COLUMN `name` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `notifications` DROP COLUMN `actionLabel`,
    DROP COLUMN `channels`,
    DROP COLUMN `data`,
    DROP COLUMN `isSent`,
    DROP COLUMN `priority`,
    DROP COLUMN `sentAt`;

-- AlterTable
ALTER TABLE `profiles` DROP COLUMN `accountLabel`,
    DROP COLUMN `avatarColor`,
    DROP COLUMN `bio`,
    DROP COLUMN `customFields`,
    DROP COLUMN `gender`,
    DROP COLUMN `isLearningProfile`,
    DROP COLUMN `learningPreferences`,
    DROP COLUMN `location`,
    DROP COLUMN `settings`,
    DROP COLUMN `socialLinks`,
    DROP COLUMN `websiteUrl`;

-- AlterTable
ALTER TABLE `sub_account_controls` DROP COLUMN `allowedDays`,
    DROP COLUMN `contentFilters`,
    DROP COLUMN `gameTimeLimitMinutes`,
    DROP COLUMN `learningGoals`,
    DROP COLUMN `spendingLimitGems`;

-- AlterTable
ALTER TABLE `subscription_plans` DROP COLUMN `hasAnalyticsDashboard`,
    DROP COLUMN `hasOfflineAccess`,
    DROP COLUMN `hasPremiumContent`,
    DROP COLUMN `hasProgressReports`,
    DROP COLUMN `maxDevices`,
    DROP COLUMN `sortOrder`;

-- AlterTable
ALTER TABLE `subscriptions` DROP COLUMN `includesSubAccounts`,
    DROP COLUMN `stripeCustomerId`,
    DROP COLUMN `stripeSubscriptionId`;

-- AlterTable
ALTER TABLE `transactions` DROP COLUMN `amountGems`,
    DROP COLUMN `balanceGemsAfter`;

-- AlterTable
ALTER TABLE `user_badges` DROP COLUMN `displayedOnProfile`,
    DROP COLUMN `progressData`,
    DROP COLUMN `timesUnlocked`;

-- AlterTable
ALTER TABLE `user_certificates` DROP COLUMN `awardedById`;

-- AlterTable
ALTER TABLE `user_daily_activity` DROP COLUMN `challengesCompleted`,
    DROP COLUMN `gameMinutes`,
    DROP COLUMN `gamesPlayed`,
    ADD COLUMN `stepsCompleted` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `user_lesson_progress` DROP COLUMN `completionDate`,
    DROP COLUMN `isCompleted`,
    DROP COLUMN `startedAt`,
    DROP COLUMN `timeSpentSeconds`,
    ADD COLUMN `progress` DECIMAL(5, 2) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE `user_level_progress` DROP COLUMN `currentTrackId`,
    ADD COLUMN `currentStepNumber` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `levelExamScore` DECIMAL(5, 2) NULL;

-- AlterTable
ALTER TABLE `user_stats` DROP COLUMN `currentXpLevel`,
    DROP COLUMN `totalCoursesCompleted`,
    DROP COLUMN `totalGamesPlayed`,
    DROP COLUMN `totalTracksCompleted`,
    ADD COLUMN `totalStepsCompleted` INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE `courses`;

-- DropTable
DROP TABLE `daily_challenges`;

-- DropTable
DROP TABLE `educational_games`;

-- DropTable
DROP TABLE `game_categories`;

-- DropTable
DROP TABLE `game_sessions`;

-- DropTable
DROP TABLE `languages`;

-- DropTable
DROP TABLE `sub_account_management`;

-- DropTable
DROP TABLE `tracks`;

-- DropTable
DROP TABLE `user_course_progress`;

-- DropTable
DROP TABLE `user_daily_challenges`;

-- DropTable
DROP TABLE `user_exercise_attempts`;

-- DropTable
DROP TABLE `user_inventory`;

-- DropTable
DROP TABLE `user_language_progress`;

-- DropTable
DROP TABLE `user_purchases`;

-- DropTable
DROP TABLE `user_track_progress`;

-- DropTable
DROP TABLE `virtual_shop_categories`;

-- DropTable
DROP TABLE `virtual_shop_items`;

-- DropTable
DROP TABLE `xp_levels`;

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

-- CreateIndex
CREATE UNIQUE INDEX `lessons_stepId_lessonNumber_key` ON `lessons`(`stepId`, `lessonNumber`);

-- AddForeignKey
ALTER TABLE `levels` ADD CONSTRAINT `levels_learningPathId_fkey` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `steps` ADD CONSTRAINT `steps_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE `user_step_progress` ADD CONSTRAINT `user_step_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_step_progress` ADD CONSTRAINT `user_step_progress_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `steps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_learningPathId_fkey` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
