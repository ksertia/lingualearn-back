-- Étape A de la suppression du niveau Module de la hiérarchie pédagogique.
-- Ajoute Theme.levelId (nullable, transitoire) SANS toucher à Theme.moduleId ni aux
-- tables modules/user_module_progress, qui restent intactes pour l'instant : il y a
-- des données réelles en production (120 SubTheme, 430 Content, 37 UserModuleProgress,
-- 14 UserThemeProgress). La migration de ces données (Module -> Theme, ancien Theme ->
-- SubTheme, fusion des Content) est une étape séparée ultérieure. Une fois cette
-- migration de données faite, une seconde migration Prisma rendra levelId obligatoire
-- et supprimera moduleId + les tables modules/user_module_progress.

-- AlterTable
ALTER TABLE `themes` ADD COLUMN `levelId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `themes_levelId_idx` ON `themes`(`levelId`);

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `levels`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
