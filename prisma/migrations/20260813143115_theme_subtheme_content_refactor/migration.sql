-- ============================================================
-- Refonte de la hiérarchie pédagogique
-- Module > Path > Step > (Lesson|Exercise|Quiz)  =>  Module > Theme > SubTheme > Content + Evaluation
-- Suppression définitive de l'ancien contenu (confirmé) — pas de migration de données.
-- ============================================================

-- 1. DROP des tables de progression liées à Path/Step (dépendent de paths/steps)
DROP TABLE IF EXISTS `user_quiz_progress`;
DROP TABLE IF EXISTS `user_exercise_progress`;
DROP TABLE IF EXISTS `user_step_progress`;
DROP TABLE IF EXISTS `user_path_progress`;

-- 2. DROP des tables de tentatives (dépendent de quizzes/path_quizzes/exercises)
DROP TABLE IF EXISTS `quiz_attempts`;
DROP TABLE IF EXISTS `exercise_attempts`;

-- 3. DROP des tables de contenu (ordre feuille → racine)
DROP TABLE IF EXISTS `lesson_blocks`;
DROP TABLE IF EXISTS `lessons`;
DROP TABLE IF EXISTS `exercises`;
DROP TABLE IF EXISTS `quizzes`;
DROP TABLE IF EXISTS `path_quizzes`;
DROP TABLE IF EXISTS `steps`;
DROP TABLE IF EXISTS `paths`;

-- ============================================================
-- 4. CREATE des nouvelles tables (racine → feuille)
-- ============================================================

CREATE TABLE `themes` (
  `id`          VARCHAR(191) NOT NULL,
  `moduleId`    VARCHAR(191) NOT NULL,
  `title`       VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `iconUrl`     VARCHAR(500) NULL,
  `index`       INT NOT NULL DEFAULT 0,
  `isActive`    TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `themes_moduleId_idx` (`moduleId`),
  CONSTRAINT `themes_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `sub_themes` (
  `id`          VARCHAR(191) NOT NULL,
  `themeId`     VARCHAR(191) NOT NULL,
  `title`       VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `index`       INT NOT NULL DEFAULT 0,
  `isActive`    TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `sub_themes_themeId_idx` (`themeId`),
  CONSTRAINT `sub_themes_themeId_fkey` FOREIGN KEY (`themeId`) REFERENCES `themes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `contents` (
  `id`              VARCHAR(191) NOT NULL,
  `subThemeId`      VARCHAR(191) NOT NULL,
  `contentType`     VARCHAR(20)  NOT NULL,
  `title`           VARCHAR(200) NOT NULL,
  `index`           INT NOT NULL DEFAULT 0,
  `isActive`        TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `summary`         TEXT NULL,
  `videoUrl`        VARCHAR(500) NULL,
  `description`     TEXT NULL,
  `keyPoints`       JSON NULL,
  `statement`       TEXT NULL,
  `question`        TEXT NULL,
  `possibleAnswers` JSON NULL,
  `correctAnswer`   JSON NULL,
  `explanation`     TEXT NULL,
  `resourceType`    VARCHAR(20) NULL,
  `resourceUrl`     VARCHAR(500) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `contents_subThemeId_index_key` (`subThemeId`, `index`),
  INDEX `contents_subThemeId_contentType_idx` (`subThemeId`, `contentType`),
  CONSTRAINT `contents_subThemeId_fkey` FOREIGN KEY (`subThemeId`) REFERENCES `sub_themes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `content_blocks` (
  `id`          VARCHAR(191) NOT NULL,
  `contentId`   VARCHAR(191) NOT NULL,
  `sectionType` VARCHAR(30)  NOT NULL,
  `blockType`   VARCHAR(20)  NOT NULL,
  `content`     LONGTEXT     NOT NULL,
  `caption`     VARCHAR(500) NULL,
  `index`       INT NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `content_blocks_contentId_index_key` (`contentId`, `index`),
  CONSTRAINT `content_blocks_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `contents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `evaluations` (
  `id`               VARCHAR(191) NOT NULL,
  `subThemeId`       VARCHAR(191) NOT NULL,
  `title`            VARCHAR(200) NOT NULL,
  `description`      TEXT NULL,
  `questions`        JSON NOT NULL,
  `passingScore`     INT NOT NULL DEFAULT 70,
  `maxAttempts`      INT NOT NULL DEFAULT 3,
  `timeLimitMinutes` INT NULL DEFAULT 15,
  `isActive`         TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `evaluations_subThemeId_key` (`subThemeId`),
  CONSTRAINT `evaluations_subThemeId_fkey` FOREIGN KEY (`subThemeId`) REFERENCES `sub_themes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `evaluation_attempts` (
  `id`               VARCHAR(191) NOT NULL,
  `userId`           VARCHAR(191) NOT NULL,
  `evaluationId`     VARCHAR(191) NOT NULL,
  `attemptNumber`    INT NOT NULL,
  `answers`          JSON NOT NULL,
  `score`            DECIMAL(5,2) NOT NULL,
  `passed`           TINYINT(1) NOT NULL,
  `timeSpentSeconds` INT NULL,
  `feedback`         JSON NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `evaluation_attempts_userId_evaluationId_attemptNumber_key` (`userId`, `evaluationId`, `attemptNumber`),
  INDEX `evaluation_attempts_evaluationId_fkey` (`evaluationId`),
  CONSTRAINT `evaluation_attempts_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `evaluations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `evaluation_attempts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `content_attempts` (
  `id`               VARCHAR(191) NOT NULL,
  `userId`           VARCHAR(191) NOT NULL,
  `contentId`        VARCHAR(191) NOT NULL,
  `attemptNumber`    INT NOT NULL,
  `answers`          JSON NOT NULL,
  `score`            DECIMAL(5,2) NULL,
  `isCorrect`        TINYINT(1) NULL,
  `timeSpentSeconds` INT NULL,
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `content_attempts_userId_contentId_attemptNumber_key` (`userId`, `contentId`, `attemptNumber`),
  INDEX `content_attempts_contentId_fkey` (`contentId`),
  CONSTRAINT `content_attempts_contentId_fkey` FOREIGN KEY (`contentId`) REFERENCES `contents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `content_attempts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_sub_theme_progress` (
  `id`                  VARCHAR(191) NOT NULL,
  `userId`              VARCHAR(191) NOT NULL,
  `subThemeId`          VARCHAR(191) NOT NULL,
  `progressPercentage`  DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `completedContentIds` JSON NULL,
  `evaluationScore`     DECIMAL(5,2) NULL,
  `startedAt`           DATETIME(3) NULL,
  `completedAt`         DATETIME(3) NULL,
  `lastAccessedAt`      DATETIME(3) NULL,
  `createdAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `user_sub_theme_progress_userId_subThemeId_key` (`userId`, `subThemeId`),
  INDEX `user_sub_theme_progress_subThemeId_idx` (`subThemeId`),
  INDEX `user_sub_theme_progress_userId_idx` (`userId`),
  CONSTRAINT `user_sub_theme_progress_subThemeId_fkey` FOREIGN KEY (`subThemeId`) REFERENCES `sub_themes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_sub_theme_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
