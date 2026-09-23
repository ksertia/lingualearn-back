/**
 * progressionSync.js
 *
 * Synchronise automatiquement la progression de tous les utilisateurs affectés
 * quand l'admin modifie le contenu (create/update/delete module/thème/sous-thème).
 *
 * Appelé en fire-and-forget (.catch(() => {})) depuis les services admin.
 * Ne bloque jamais la réponse HTTP. Purement informatif — aucun blocage/déblocage.
 */

const { prisma } = require('../config/prisma');
const { cacheDel } = require('./cache');

// ─── Résolution de la hiérarchie complète depuis n'importe quel niveau ────────

async function resolveHierarchy({ languageId, levelId, themeId }) {
  let langId  = languageId || null;
  let lvlId   = levelId    || null;
  let thmId   = themeId    || null;

  if ((!langId || !lvlId) && thmId) {
    const r = await prisma.theme.findUnique({ where: { id: thmId }, select: { levelId: true, level: { select: { languageId: true } } } });
    lvlId  = lvlId  || r?.levelId  || null;
    langId = langId || r?.level?.languageId || null;
  }
  if (!langId && lvlId) {
    const r = await prisma.level.findUnique({ where: { id: lvlId }, select: { languageId: true } });
    langId = r?.languageId || null;
  }

  return { languageId: langId, levelId: lvlId, themeId: thmId };
}

// ─── Recalcul complet pour un utilisateur sur une langue ─────────────────────

async function recalculateUserProgression(userId, languageId) {
  const levels = await prisma.level.findMany({
    where: { languageId, isActive: true },
    select: { id: true }
  });
  if (!levels.length) return;

  const levelIds = levels.map(l => l.id);

  const themes = await prisma.theme.findMany({ where: { levelId: { in: levelIds }, isActive: true }, select: { id: true, levelId: true } });
  const themeIds = themes.map(t => t.id);

  const subThemes = themeIds.length > 0
    ? await prisma.subTheme.findMany({ where: { themeId: { in: themeIds }, isActive: true }, select: { id: true, themeId: true } })
    : [];
  const subThemeIds = subThemes.map(s => s.id);

  const progressRows = subThemeIds.length > 0
    ? await prisma.userSubThemeProgress.findMany({
        where: { userId, subThemeId: { in: subThemeIds } },
        select: { subThemeId: true, progressPercentage: true }
      })
    : [];

  const progressMap = new Map(progressRows.map(r => [r.subThemeId, Number(r.progressPercentage)]));

  const themeToLevel = new Map(themes.map(t => [t.id, t.levelId]));

  const sumByTheme = new Map(); const cntByTheme = new Map();
  const sumByLevel = new Map(); const cntByLevel = new Map();
  let sumAll = 0, cntAll = 0;

  for (const s of subThemes) {
    const lvlId = themeToLevel.get(s.themeId);
    const pct = progressMap.get(s.id) || 0;

    sumByTheme.set(s.themeId, (sumByTheme.get(s.themeId) || 0) + pct);
    cntByTheme.set(s.themeId, (cntByTheme.get(s.themeId) || 0) + 1);

    if (lvlId) {
      sumByLevel.set(lvlId, (sumByLevel.get(lvlId) || 0) + pct);
      cntByLevel.set(lvlId, (cntByLevel.get(lvlId) || 0) + 1);
    }
    sumAll += pct;
    cntAll++;
  }

  const avg = (sum, cnt) => cnt > 0 ? Math.round((sum / cnt) * 100) / 100 : 0;

  const updates = [];

  for (const t of themes) {
    const cnt = cntByTheme.get(t.id) || 0;
    if (cnt > 0) {
      updates.push(prisma.userThemeProgress.updateMany({
        where: { userId, themeId: t.id },
        data:  { progressPercentage: avg(sumByTheme.get(t.id) || 0, cnt) }
      }));
    }
  }

  for (const l of levels) {
    const cnt = cntByLevel.get(l.id) || 0;
    if (cnt > 0) {
      updates.push(prisma.userLevelProgress.updateMany({
        where: { userId, levelId: l.id },
        data:  { progressPercentage: avg(sumByLevel.get(l.id) || 0, cnt) }
      }));
    }
  }

  updates.push(prisma.userLanguageProgress.updateMany({
    where: { userId, languageId },
    data:  { overallProgress: avg(sumAll, cntAll) }
  }));

  if (updates.length) await Promise.all(updates);
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

/**
 * Synchronise la progression de tous les utilisateurs affectés après un changement admin.
 *
 * @param {object} ids  Au moins un de : { languageId, levelId, themeId }
 * @param {string} action  'create' | 'update' | 'delete'
 */
async function syncAllUsersProgression(ids, action = 'update') {
  try {
    const { languageId, levelId, themeId } = await resolveHierarchy(ids);
    if (!languageId) return;

    const affected = await prisma.userLanguageProgress.findMany({
      where: { languageId },
      select: { userId: true }
    });
    if (!affected.length) return;

    const userIds = affected.map(u => u.userId);

    const BATCH = 10;
    for (let i = 0; i < userIds.length; i += BATCH) {
      const batch = userIds.slice(i, i + BATCH);
      await Promise.all(batch.map(uid =>
        recalculateUserProgression(uid, languageId).catch(() => {})
      ));
    }

    const userKeys = [];
    for (const uid of userIds) {
      userKeys.push(`user:${uid}:progress`);
      userKeys.push(`user-levels:${uid}`);
      if (levelId) userKeys.push(`user:${uid}:themes:level:${levelId}`);
    }
    if (themeId) userKeys.push(`subthemes:theme:${themeId}`);
    if (userKeys.length) await cacheDel(...userKeys).catch(() => {});

  } catch (_) {
    // Silencieux — ne bloque jamais la requête admin
  }
}

module.exports = { syncAllUsersProgression };
