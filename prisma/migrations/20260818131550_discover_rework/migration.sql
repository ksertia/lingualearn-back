-- Refonte du module Discover : suppression du système mort (tables jamais
-- réellement créées en base malgré leur présence dans un ancien schema.prisma)
-- et de la table orpheline discovery_sessions (créée hors du cycle de vie
-- Prisma par une ancienne migration, sans modèle correspondant dans le
-- schéma actuel). Ajoute isDemo sur sub_themes pour marquer explicitement
-- le sous-thème vitrine de chaque langue, exposé publiquement sans compte.

ALTER TABLE `sub_themes` ADD COLUMN `isDemo` TINYINT(1) NOT NULL DEFAULT 0;

DROP TABLE IF EXISTS `discover_options`;
DROP TABLE IF EXISTS `discover_contents`;
DROP TABLE IF EXISTS `discover_sections`;
DROP TABLE IF EXISTS `discovery_sessions`;
