-- Le modèle AppSetting existe dans schema.prisma depuis avril 2026 mais n'avait
-- jamais été accompagné d'une migration réelle — la table n'existait donc pas
-- en base malgré `prisma migrate status` annonçant "up to date". Corrige cet
-- oubli historique, sans lien avec la refonte de la hiérarchie pédagogique.

CREATE TABLE IF NOT EXISTS `app_settings` (
  `id`        VARCHAR(191) NOT NULL,
  `key`       VARCHAR(100) NOT NULL,
  `value`     VARCHAR(500) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `app_settings_key_key` (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
