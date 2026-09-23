-- Suite de la migration 20260923104942_add_theme_level_id.
-- Theme.moduleId devient nullable : un nouveau thème peut désormais être créé
-- directement sous un Level, sans Module. Change aussi la contrainte FK en
-- ON DELETE SET NULL (au lieu de CASCADE) : supprimer un Module ne doit plus
-- supprimer les Theme qui en dépendent encore pendant la transition.
-- Aucune donnée existante affectée (moduleId reste renseigné sur les lignes actuelles).

-- DropForeignKey
ALTER TABLE `themes` DROP FOREIGN KEY `themes_moduleId_fkey`;

-- AlterTable
ALTER TABLE `themes` MODIFY `moduleId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `themes` ADD CONSTRAINT `themes_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
