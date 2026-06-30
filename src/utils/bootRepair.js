/**
 * bootRepair.js
 *
 * Exécuté une fois au démarrage du serveur (fire-and-forget).
 *
 * Phase 1 — Déblocage : crée les rows userModuleProgress/userPathProgress/userStepProgress
 *   manquantes pour les utilisateurs qui ont un level unlocked/started sans module.
 *
 * Phase 2 — Recalcul : recalcule progressPercentage / overallProgress pour TOUS les
 *   utilisateurs ayant une progression, afin de corriger les données historiques.
 */

const { prisma } = require('../config/prisma');
const { cacheInvalidatePattern } = require('./cache');
const { syncAllUsersProgression } = require('./progressionSync');

async function repairMissingProgression() {
  try {
    // ── Phase 1 : Débloquer les utilisateurs sans module ──────────────────────
    const levelProgs = await prisma.userLevelProgress.findMany({
      where: { status: { in: ['unlocked', 'started'] } },
      select: { userId: true, levelId: true },
    });

    if (levelProgs.length) {
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
      if (toFix.length) {
        console.log(`[bootRepair] Phase 1 : ${toFix.length} utilisateur(s) sans module — débloquage...`);
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
                console.error(`[bootRepair] unlock user=${userId} level=${levelId}: ${e.message}`);
              }
            })
          );
        }
        console.log(`[bootRepair] Phase 1 terminée — ${fixed}/${toFix.length} débloqués.`);
      }
    }

    // ── Phase 2 : Recalculer les pourcentages pour tous les utilisateurs ──────
    // Récupérer toutes les langues avec au moins un utilisateur ayant une progression
    const langProgs = await prisma.userLanguageProgress.findMany({
      select: { languageId: true },
      distinct: ['languageId'],
    });

    if (langProgs.length) {
      console.log(`[bootRepair] Phase 2 : recalcul progression pour ${langProgs.length} langue(s)...`);

      for (const { languageId } of langProgs) {
        // syncAllUsersProgression recalcule tous les users de cette langue
        await syncAllUsersProgression({ languageId }, 'update').catch(e =>
          console.error(`[bootRepair] recalcul langue=${languageId}: ${e.message}`)
        );
      }

      console.log(`[bootRepair] Phase 2 terminée — pourcentages recalculés.`);
    }

    // ── Invalider tous les caches ─────────────────────────────────────────────
    await Promise.all([
      cacheInvalidatePattern('user:*:progress'),
      cacheInvalidatePattern('user-levels:*'),
      cacheInvalidatePattern('user:*:modules:level:*'),
    ]).catch(() => {});

    console.log('[bootRepair] Réparation complète terminée.');
  } catch (err) {
    console.error('[bootRepair] Erreur:', err.message);
  }
}

module.exports = repairMissingProgression;
