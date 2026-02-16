# Solution au Problème "Too Many Connections" MySQL

## 🔴 Problème
MySQL refuse les nouvelles connexions avec l'erreur : `ERROR HY000 (1040): Too many connections`

## ✅ Solutions Appliquées

### 1. **Instance Unique de PrismaClient** ✅
Tous les fichiers utilisent maintenant le singleton au lieu de créer de nouvelles instances.

### 2. **Pool de Connexions Limité** ✅
Configuration dans `src/config/prisma.js` :
- `connection_limit=3` : Maximum 3 connexions par instance
- `pool_timeout=20` : Timeout de 20 secondes
- `connect_timeout=10` : Timeout de connexion de 10 secondes

### 3. **Gestion Propre des Déconnexions** ✅
Handlers ajoutés pour fermer les connexions lors de l'arrêt du serveur.

## 🚨 Solution Immédiate Requise

### Option A : Augmenter la Limite MySQL (RECOMMANDÉ)

Connectez-vous à MySQL en tant qu'administrateur et exécutez :

```sql
-- Voir la limite actuelle
SHOW VARIABLES LIKE 'max_connections';

-- Augmenter temporairement (jusqu'au redémarrage)
SET GLOBAL max_connections = 500;

-- Ou modifier définitivement dans my.cnf/my.ini
[mysqld]
max_connections = 500
```

### Option B : Tuer les Connexions Existantes

Connectez-vous à MySQL et exécutez :

```sql
-- Voir toutes les connexions
SHOW PROCESSLIST;

-- Tuer une connexion spécifique
KILL <process_id>;

-- Ou tuer toutes les connexions de l'application
SELECT CONCAT('KILL ', ID, ';') AS kill_command
FROM information_schema.PROCESSLIST
WHERE DB = 'learning-db' AND USER = 'root' AND ID != CONNECTION_ID();
-- Copier et exécuter les commandes KILL générées
```

### Option C : Redémarrer MySQL (RAPIDE)

```bash
# Windows
net stop MySQL
net start MySQL

# Linux
sudo systemctl restart mysql
```

## 📊 Vérification

Après avoir appliqué une solution, vérifiez :

```sql
-- Nombre de connexions actives
SELECT COUNT(*) FROM information_schema.PROCESSLIST WHERE DB = 'learning-db';

-- Détails des connexions
SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE
FROM information_schema.PROCESSLIST
WHERE DB = 'learning-db';
```

## 🔧 Configuration Optimale

### Dans `.env` ou MySQL :
```
# Limite MySQL recommandée pour production
max_connections = 500

# Pour développement
max_connections = 200
```

### Dans `src/config/prisma.js` :
- ✅ Pool limité à 3 connexions
- ✅ Singleton global
- ✅ Déconnexion propre

## 🎯 Prochaines Étapes

1. **Immédiat** : Augmenter `max_connections` MySQL à 500
2. **Court terme** : Redémarrer le serveur Node.js
3. **Long terme** : Monitorer les connexions MySQL

## 📝 Commandes Utiles

```bash
# Tuer tous les processus Node.js (Windows)
taskkill /F /IM node.exe

# Redémarrer le serveur
npm run dev

# Vérifier les connexions MySQL
mysql -u root -p -e "SHOW PROCESSLIST;"
```
