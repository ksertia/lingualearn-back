-- Remplace l'index non-unique (lessonId, index) par une contrainte UNIQUE
-- pour empêcher deux blocs de la même leçon de partager le même ordre d'affichage.
-- L'index existant sert de support à la FK lessonId -> lessons.id : on crée
-- d'abord le nouvel index unique, MySQL bascule alors la FK dessus, puis on
-- peut supprimer l'ancien index non-unique.
CREATE UNIQUE INDEX `lesson_blocks_lessonId_index_key` ON `lesson_blocks`(`lessonId`, `index`);

DROP INDEX `lesson_blocks_lessonId_index_idx` ON `lesson_blocks`;
