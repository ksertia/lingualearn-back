-- Script pour tuer toutes les connexions MySQL de l'application
-- À exécuter en tant qu'administrateur MySQL

-- Voir toutes les connexions actives
SELECT 
    ID, 
    USER, 
    HOST, 
    DB, 
    COMMAND, 
    TIME, 
    STATE, 
    INFO
FROM 
    information_schema.PROCESSLIST
WHERE 
    DB = 'learning-db' 
    AND USER = 'root'
    AND COMMAND != 'Sleep';

-- Pour tuer toutes les connexions (décommenter si nécessaire)
-- SELECT CONCAT('KILL ', ID, ';') 
-- FROM information_schema.PROCESSLIST 
-- WHERE DB = 'learning-db' AND USER = 'root' AND ID != CONNECTION_ID();
