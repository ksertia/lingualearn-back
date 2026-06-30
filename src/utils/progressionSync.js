/**
 * progressionSync.js
 *
 * Synchronise automatiquement la progression de tous les utilisateurs affectés
 * quand l'admin modifie le contenu (create/update/delete module/parcours/étape/niveau).
 *
 * Appelé en fire-and-forget (.catch(() => {})) depuis les services admin.
 * Ne bloque jamais la réponse HTTP.
 */

const { prisma } = require('../config/prisma');
const { cacheDel, cacheInvalidatePattern } = require('./cache');

// ─── Résolution de la hiérarchie complète depuis n'importe quel niveau ────────

async function resolveHierarchy({ languageId, levelId, moduleId, pathId, stepId }) {
  let langId = languageId || null;
  let lvlId  = levelId   || null;
  let modId  = moduleId  || null;
  let pthId  = pathId    || null;

  if (!langId && lvlId) {
    const r = await prisma.level.findUnique({ where: { id: lvlId }, select: { languageId: true } });
    langId = r?.languageId || null;
  }
  if ((!langId || !lvlId) && modId) {
    const r = await prisma.module.findUnique({ where: { id: modId }, select: { levelId: true, level: { select: { languageId: true } } } });
    lvlId  = lvlId  || r?.levelId  || null;
    langId = langId || r?.level?.languageId || null;
  }
  if ((!langId || !lvlId || !modId) && pthId) {
    const r = await prisma.path.findUnique({ where: { id: pthId }, select: { moduleId: true, module: { select: { levelId: true, level: { select: { languageId: true } } } } } });
    modId  = modId  || r?.moduleId || null;
    lvlId  = lvlId  || r?.module?.levelId || null;
    langId = langId || r?.module?.level?.languageId || null;
  }
  if ((!langId || !lvlId || !modId) && stepId) {
    const r = await prisma.step.findUnique({ where: { id: stepId }, select: { pathId: true, path: { select: { moduleId: true, module: { select: { levelId: true, level: { select: { languageId: true } } } } } } } });
    pthId  = pthId  || r?.pathId || null;
    modId  = modId  || r?.path?.moduleId || null;
    lvlId  = lvlId  || r?.path?.module?.levelId || null;
    langId = langId || r?.path?.module?.level?.languageId || null;
  }

  return { languageId: langId, levelId: lvlId, moduleId: modId, pathId: pthId };
}

// ─── Recalcul complet pour un utilisateur sur une langue ─────────────────────

async function recalculateUserProgression(userId, languageId) {
  // Charger toute la structure active en parallèle
  const levels = await prisma.level.findMany({
    where: { languageId, isActive: true },
    select: { id: true }
  });
  if (!levels.length) return;

  const levelIds = levels.map(l => l.id);

  const [modules, paths] = await Promise.all([
    prisma.module.findMany({ where: { levelId: { in: levelIds }, isActive: true }, select: { id: true, levelId: true } }),
    prisma.path.findMany({ where: { module: { levelId: { in: levelIds } }, isActive: true }, select: { id: true, moduleId: true } }),
  ]);

  const moduleIds = modules.map(m => m.id);
  const pathIds   = paths.map(p => p.id);

  const steps = pathIds.length > 0
    ? await prisma.step.findMany({ where: { pathId: { in: pathIds }, isActive: true }, select: { id: true, pathId: true } })
    : [];

  const stepIds = steps.map(s => s.id);

  // Étapes complétées par cet utilisateur
  const completedRows = stepIds.length > 0
    ? await prisma.userStepProgress.findMany({
        where: { userId, stepId: { in: stepIds }, status: 'completed' },
        select: { stepId: true }
      })
    : [];

  const completedSet = new Set(completedRows.map(r => r.stepId));

  // Maps moduleId et levelId pour les steps
  const pathToModule = new Map(paths.map(p => [p.id, p.moduleId]));
  const modToLevel   = new Map(modules.map(m => [m.id, m.levelId]));

  // Compteurs
  const totalByPath   = new Map();
  const doneByPath    = new Map();
  const totalByModule = new Map();
  const doneByModule  = new Map();
  const totalByLevel  = new Map();
  const doneByLevel   = new Map();
  let   totalAll = 0;
  let   doneAll  = 0;

  for (const s of steps) {
    const modId = pathToModule.get(s.pathId);
    const lvlId = modId ? modToLevel.get(modId) : null;
    const done  = completedSet.has(s.id);

    totalByPath.set(s.pathId, (totalByPath.get(s.pathId) || 0) + 1);
    if (done) doneByPath.set(s.pathId, (doneByPath.get(s.pathId) || 0) + 1);

    if (modId) {
      totalByModule.set(modId, (totalByModule.get(modId) || 0) + 1);
      if (done) doneByModule.set(modId, (doneByModule.get(modId) || 0) + 1);
    }
    if (lvlId) {
      totalByLevel.set(lvlId, (totalByLevel.get(lvlId) || 0) + 1);
      if (done) doneByLevel.set(lvlId, (doneByLevel.get(lvlId) || 0) + 1);
    }
    totalAll++;
    if (done) doneAll++;
  }

  const pct = (done, total) => total > 0 ? Math.round((done / total) * 100) : 0;

  // Construire toutes les mises à jour en parallèle
  const updates = [];

  for (const p of paths) {
    const total = totalByPath.get(p.id) || 0;
    if (total > 0) {
      updates.push(prisma.userPathProgress.updateMany({
        where: { userId, pathId: p.id },
        data:  { progressPercentage: pct(doneByPath.get(p.id) || 0, total) }
      }));
    }
  }

  for (const m of modules) {
    const total = totalByModule.get(m.id) || 0;
    if (total > 0) {
      updates.push(prisma.userModuleProgress.updateMany({
        where: { userId, moduleId: m.id },
        data:  { progressPercentage: pct(doneByModule.get(m.id) || 0, total) }
      }));
    }
  }

  for (const l of levels) {
    const total = totalByLevel.get(l.id) || 0;
    if (total > 0) {
      updates.push(prisma.userLevelProgress.updateMany({
        where: { userId, levelId: l.id },
        data:  { progressPercentage: pct(doneByLevel.get(l.id) || 0, total) }
      }));
    }
  }

  updates.push(prisma.userLanguageProgress.updateMany({
    where: { userId, languageId },
    data:  { overallProgress: pct(doneAll, totalAll) }
  }));

  if (updates.length) await Promise.all(updates);
}

// ─── Déblocage automatique si plus aucun contenu devant l'utilisateur ────────

async function autoUnlockIfBlocked(userId, languageId) {
  // Charger progression.service sans circular dep (require tardif)
  const progressionService = require('../modules/progression/progression.service');

  const levels = await prisma.level.findMany({
    where: { languageId, isActive: true },
    orderBy: { index: 'asc' },
    select: { id: true }
  });

  for (const level of levels) {
    const levelProg = await prisma.userLevelProgress.findUnique({
      where: { userId_levelId: { userId, levelId: level.id } },
      select: { status: true }
    });
    if (!levelProg || !['unlocked', 'started'].includes(levelProg.status)) continue;

    // Vérifier si l'utilisateur a déjà un module actif dans ce niveau
    const activeModule = await prisma.userModuleProgress.findFirst({
      where: { userId, status: { in: ['unlocked', 'started'] }, module: { levelId: level.id, isActive: true } }
    });
    if (activeModule) {
      // Vérifier si ce module a un parcours actif
      const activePath = await prisma.userPathProgress.findFirst({
        where: { userId, status: { in: ['unlocked', 'started'] }, path: { moduleId: activeModule.moduleId, isActive: true } }
      });
      if (activePath) {
        // Vérifier si ce parcours a une étape active
        const activeStep = await prisma.userStepProgress.findFirst({
          where: { userId, status: { in: ['unlocked', 'started'] }, step: { pathId: activePath.pathId, isActive: true } }
        });
        if (activeStep) continue; // tout va bien

        // Pas d'étape active → débloquer la première étape disponible
        await progressionService.unlockPathWithChildren(userId, activePath.pathId).catch(() => {});
      } else {
        // Pas de parcours actif → débloquer depuis le module
        await progressionService.unlockModuleWithChildren(userId, activeModule.moduleId).catch(() => {});
      }
    } else {
      // Pas de module actif → débloquer depuis le niveau
      await progressionService.unlockLevelWithChildren(userId, level.id).catch(() => {});
    }
    break;
  }
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

/**
 * Synchronise la progression de tous les utilisateurs affectés après un changement admin.
 *
 * @param {object} ids  Au moins un de : { languageId, levelId, moduleId, pathId, stepId }
 * @param {string} action  'create' | 'update' | 'delete'
 */
async function syncAllUsersProgression(ids, action = 'update') {
  try {
    const { languageId, levelId, moduleId, pathId } = await resolveHierarchy(ids);
    if (!languageId) return;

    // Tous les utilisateurs ayant une progression sur cette langue
    const affected = await prisma.userLanguageProgress.findMany({
      where: { languageId },
      select: { userId: true }
    });
    if (!affected.length) return;

    const userIds = affected.map(u => u.userId);

    // Invalider les caches de structure (force rechargement depuis DB)
    const structKeys = [];
    if (pathId)    structKeys.push(`struct:path:${pathId}:stepIds`);
    if (moduleId)  structKeys.push(`struct:module:${moduleId}:stepIds`);
    if (levelId)   structKeys.push(`struct:level:${levelId}:stepIds`);
    structKeys.push(`struct:language:${languageId}:stepIds`);
    await cacheDel(...structKeys).catch(() => {});

    // Recalcul par batch de 10 pour ne pas saturer le pool DB
    const BATCH = 10;
    for (let i = 0; i < userIds.length; i += BATCH) {
      const batch = userIds.slice(i, i + BATCH);
      await Promise.all(batch.map(uid =>
        recalculateUserProgression(uid, languageId).catch(() => {})
      ));
    }

    // Sur create : débloquer automatiquement si l'utilisateur est bloqué
    if (action === 'create') {
      for (let i = 0; i < userIds.length; i += BATCH) {
        const batch = userIds.slice(i, i + BATCH);
        await Promise.all(batch.map(uid =>
          autoUnlockIfBlocked(uid, languageId).catch(() => {})
        ));
      }
    }

    // Invalider tous les caches utilisateur
    const userKeys = [];
    for (const uid of userIds) {
      userKeys.push(`user:${uid}:progress`);
      userKeys.push(`user-levels:${uid}`);
      if (levelId) userKeys.push(`user:${uid}:modules:level:${levelId}`);
    }
    if (moduleId) userKeys.push(`paths:module:${moduleId}`);
    if (userKeys.length) await cacheDel(...userKeys).catch(() => {});

  } catch (_) {
    // Silencieux — ne bloque jamais la requête admin
  }
}

module.exports = { syncAllUsersProgression };
