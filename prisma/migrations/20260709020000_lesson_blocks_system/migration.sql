-- Migrer les données existantes de lessons vers lesson_blocks
-- avant de modifier la table lessons

-- 1. Créer la table lesson_blocks
CREATE TABLE `lesson_blocks` (
  `id`          VARCHAR(191) NOT NULL,
  `lessonId`    VARCHAR(191) NOT NULL,
  `sectionType` VARCHAR(30)  NOT NULL,
  `contentType` VARCHAR(20)  NOT NULL,
  `content`     LONGTEXT     NOT NULL,
  `caption`     VARCHAR(500) NULL,
  `index`       INT          NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `lesson_blocks_lessonId_index_idx` (`lessonId`, `index`),
  CONSTRAINT `lesson_blocks_lessonId_fkey`
    FOREIGN KEY (`lessonId`) REFERENCES `lessons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Migrer le contenu existant → bloc "main" (contenu principal)
INSERT INTO `lesson_blocks` (`id`, `lessonId`, `sectionType`, `contentType`, `content`, `index`, `createdAt`, `updatedAt`)
SELECT
  CONCAT('blk_', `id`),
  `id`,
  'main',
  COALESCE(`contentType`, 'text'),
  COALESCE(`content`, ''),
  0,
  `createdAt`,
  `updatedAt`
FROM `lessons`
WHERE `content` IS NOT NULL AND `content` != '';

-- 3. Ajouter summary sur lessons + supprimer anciens champs
ALTER TABLE `lessons`
  ADD COLUMN `summary` TEXT NULL,
  ADD COLUMN `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  DROP COLUMN `contentType`,
  DROP COLUMN `content`,
  DROP COLUMN `attachments`;
