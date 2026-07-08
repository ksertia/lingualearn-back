-- Migration: add contentType to lessons, migrate videoUrl into content, drop videoUrl
-- 1. Ajouter contentType avec valeur par défaut 'text'
ALTER TABLE `lessons` ADD COLUMN `contentType` VARCHAR(20) NOT NULL DEFAULT 'text';

-- 2. Pour les lignes qui ont une videoUrl, mettre contentType='video' et déplacer l'URL dans content
UPDATE `lessons` SET `contentType` = 'video', `content` = `videoUrl` WHERE `videoUrl` IS NOT NULL AND `videoUrl` != '';

-- 3. Supprimer la colonne videoUrl
ALTER TABLE `lessons` DROP COLUMN `videoUrl`;
