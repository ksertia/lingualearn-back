/**
 * bootRepair.js
 *
 * Exécuté une fois au démarrage du serveur.
 * Crée les rows userModuleProgress / userPathProgress / userStepProgress manquantes
 * pour tous les utilisateurs qui ont un level unlocked/started mais aucun module débloqué.
 *
 * Fire-and-forget : ne bloque pas le démarrage du serveur.
 */

const { prisma } = require('../config/prisma');
const { cacheInvalidatePattern } = require('./cache');

async function repairMissingProgression() {
  try {
    // Trouver tous les (userId, levelId) où le level est actif mais aucun module progressé
    const levelProgs = await prisma.userLevelProgress.findMany({
      where: { status: { in: ['unlocked', 'started'] } },
      select: { userId: true, levelId: true },
    });

    if (!levelProgs.length) return;

    // Pour chaque paire, vérifier si un userModuleProgress existe
    const checks = await Promise.all(
      levelProgs.map(async ({ userId, levelId }) => {
        const hasModule = await prisma.userModuleProgress.findFirst({
          where: { userId, module: { levelId, isActive: true } },
          select: { id: true },
        });
        return hasModule ? null : { userId, levelId };
      })
    );

    const toFix = checks.filter(Boolean);
    if (!toFix.length) return;

    console.log(`[bootRepair] ${toFix.length} utilisateur(s) sans module débloqué — réparation en cours...`);

    // Require tardif pour éviter les dépendances circulaires
    const progressionService = require('../modules/progression/progression.service');

    const BATCH = 5;
    let fixed = 0;

    for (let i = 0; i < toFix.length; i += BATCH) {
      const batch = toFix.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async ({ userId, levelId }) => {
          try {
            await progressionService.unlockLevelWithChildren(userId, levelId);
            fixed++;
          } catch (e) {
            console.error(`[bootRepair] user=${userId} level=${levelId}: ${e.message}`);
          }
        })
      );
    }

    // Invalider tous les caches de progression
    await Promise.all([
      cacheInvalidatePattern('user:*:progress'),
      cacheInvalidatePattern('user-levels:*'),
      cacheInvalidatePattern('user:*:modules:level:*'),
    ]).catch(() => {});

    console.log(`[bootRepair] Terminé — ${fixed}/${toFix.length} utilisateur(s) réparés.`);
  } catch (err) {
    console.error('[bootRepair] Erreur:', err.message);
  }
}

module.exports = repairMissingProgression;
