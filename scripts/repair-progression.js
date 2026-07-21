/**
 * Script de réparation : crée les rows userModuleProgress / userPathProgress / userStepProgress
 * manquantes pour tous les utilisateurs qui ont un level unlocked/started mais aucun module progressé.
 *
 * Usage : node scripts/repair-progression.js
 */

const { prisma } = require('../src/config/prisma');
const { syncAllUsersProgression } = require('../src/utils/progressionSync');

async function main() {
  // Trouver tous les utilisateurs ayant un level actif mais aucun module progressé
  const levelProgs = await prisma.userLevelProgress.findMany({
    where: { status: { in: ['unlocked', 'started'] } },
    select: { userId: true, levelId: true },
  });

  console.log(`Found ${levelProgs.length} active level progress rows`);

  let fixed = 0;
  const BATCH = 5;

  for (let i = 0; i < levelProgs.length; i += BATCH) {
    const batch = levelProgs.slice(i, i + BATCH);
    await Promise.all(batch.map(async ({ userId, levelId }) => {
      // Vérifier si l'utilisateur a déjà un module progressé pour ce level
      const hasModule = await prisma.userModuleProgress.findFirst({
        where: { userId, module: { levelId, isActive: true } },
        select: { id: true }
      });
      if (hasModule) return;

      // Pas de module → appeler unlockLevelWithChildren
      const progressionService = require('../src/modules/progression/progression.service');
      try {
        await progressionService.unlockLevelWithChildren(userId, levelId);
        console.log(`  Fixed: user=${userId} level=${levelId}`);
        fixed++;
      } catch (e) {
        console.error(`  Error: user=${userId} level=${levelId}: ${e.message}`);
      }
    }));
  }

  // Invalider tous les caches user:progress
  const { cacheInvalidatePattern } = require('../src/utils/cache');
  await cacheInvalidatePattern('user:*:progress').catch(() => {});
  await cacheInvalidatePattern('user-levels:*').catch(() => {});

  console.log(`\nDone. Fixed ${fixed}/${levelProgs.length} users.`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
