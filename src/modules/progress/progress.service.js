const { prisma } = require('../../config/prisma');

// Dérive un état lisible à partir des données réelles de progression —
// remplace le champ `status` legacy (locked/unlocked), qui reste dans le
// schéma pour compatibilité mais n'est plus jamais écrit ni fiable depuis
// la suppression du blocage séquentiel. Ne bloque jamais rien, purement
// informatif pour l'affichage (ex: badge "terminé" / "en cours").
exports.deriveState = ({ progressPercentage, startedAt, completedAt } = {}) => {
  if (completedAt || Number(progressPercentage) >= 100) return 'completed';
  if (startedAt || Number(progressPercentage) > 0) return 'in_progress';
  return 'not_started';
};

// Recalcule le % de progression d'un sous-thème pour un utilisateur.
// Un sous-thème est "complété" une fois que tous ses contenus actifs sont dans
// completedContentIds ET que l'évaluation (si elle existe) a été réussie.
// Aucun statut locked/unlocked — uniquement informatif.
exports.recalculateSubThemeProgress = async (userId, subThemeId, { completedContentId = null, evaluationScore = null } = {}) => {
  const subTheme = await prisma.subTheme.findUnique({
    where: { id: subThemeId },
    include: { contents: { where: { isActive: true }, select: { id: true } }, evaluation: { select: { id: true, passingScore: true } } }
  });
  if (!subTheme) throw new Error('Sous-thème non trouvé');

  const existing = await prisma.userSubThemeProgress.findUnique({ where: { userId_subThemeId: { userId, subThemeId } } });
  const completedSet = new Set(existing?.completedContentIds || []);
  if (completedContentId) completedSet.add(completedContentId);

  const totalContents = subTheme.contents.length;
  const doneContents = subTheme.contents.filter(c => completedSet.has(c.id)).length;

  const hasEvaluation = !!subTheme.evaluation;
  const finalEvaluationScore = evaluationScore !== null ? evaluationScore : existing?.evaluationScore ?? null;
  const evaluationDone = !hasEvaluation || (finalEvaluationScore !== null && finalEvaluationScore >= subTheme.evaluation.passingScore);

  const totalUnits = totalContents + (hasEvaluation ? 1 : 0);
  const doneUnits = doneContents + (hasEvaluation && evaluationDone ? 1 : 0);
  const progressPercentage = totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100 * 100) / 100 : 0;

  const now = new Date();
  return prisma.userSubThemeProgress.upsert({
    where: { userId_subThemeId: { userId, subThemeId } },
    update: {
      progressPercentage,
      completedContentIds: Array.from(completedSet),
      evaluationScore: finalEvaluationScore,
      startedAt: existing?.startedAt || now,
      completedAt: progressPercentage >= 100 ? now : null,
      lastAccessedAt: now
    },
    create: {
      userId, subThemeId,
      progressPercentage,
      completedContentIds: Array.from(completedSet),
      evaluationScore: finalEvaluationScore,
      startedAt: now,
      completedAt: progressPercentage >= 100 ? now : null,
      lastAccessedAt: now
    }
  });
};

// Moyenne des % de tous les sous-thèmes d'un module pour un utilisateur, remontée à UserModuleProgress/UserLevelProgress.
exports.recalculateModuleAndLevelProgress = async (userId, moduleId) => {
  const module_ = await prisma.module.findUnique({ where: { id: moduleId }, select: { levelId: true } });
  if (!module_) throw new Error('Module non trouvé');

  const subThemes = await prisma.subTheme.findMany({
    where: { theme: { moduleId }, isActive: true },
    select: { id: true }
  });

  let moduleProgress = 0;
  if (subThemes.length > 0) {
    const progresses = await prisma.userSubThemeProgress.findMany({
      where: { userId, subThemeId: { in: subThemes.map(s => s.id) } },
      select: { progressPercentage: true }
    });
    const sum = progresses.reduce((acc, p) => acc + Number(p.progressPercentage), 0);
    moduleProgress = Math.round((sum / subThemes.length) * 100) / 100;
  }

  const now = new Date();
  await prisma.userModuleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    update: { progressPercentage: moduleProgress, lastAccessedAt: now, completedAt: moduleProgress >= 100 ? now : null },
    create: { userId, moduleId, progressPercentage: moduleProgress, startedAt: now, lastAccessedAt: now }
  });

  // Moyenne des modules du level
  const modules = await prisma.module.findMany({ where: { levelId: module_.levelId, isActive: true }, select: { id: true } });
  let levelProgress = 0;
  if (modules.length > 0) {
    const moduleProgresses = await prisma.userModuleProgress.findMany({
      where: { userId, moduleId: { in: modules.map(m => m.id) } },
      select: { progressPercentage: true }
    });
    const sum = moduleProgresses.reduce((acc, p) => acc + Number(p.progressPercentage), 0);
    levelProgress = Math.round((sum / modules.length) * 100) / 100;
  }

  await prisma.userLevelProgress.upsert({
    where: { userId_levelId: { userId, levelId: module_.levelId } },
    update: { progressPercentage: levelProgress, lastAccessedAt: now, completedAt: levelProgress >= 100 ? now : null },
    create: { userId, levelId: module_.levelId, progressPercentage: levelProgress, startedAt: now, lastAccessedAt: now }
  });

  return { moduleProgress, levelProgress };
};

// Résumé de progression d'un utilisateur pour un level : liste des modules avec leur %.
exports.getUserLevelProgressSummary = async (userId, levelId) => {
  const level = await prisma.level.findUnique({ where: { id: levelId } });
  if (!level) throw new Error('Niveau non trouvé');

  const modules = await prisma.module.findMany({
    where: { levelId, isActive: true },
    orderBy: { index: 'asc' },
    include: { userProgress: { where: { userId }, select: { progressPercentage: true, startedAt: true, completedAt: true, lastAccessedAt: true } } }
  });

  const levelProgress = await prisma.userLevelProgress.findUnique({ where: { userId_levelId: { userId, levelId } } });

  return {
    levelId,
    state: exports.deriveState(levelProgress || {}),
    progressPercentage: levelProgress?.progressPercentage || 0,
    modules: modules.map(m => ({
      id: m.id,
      title: m.title,
      state: exports.deriveState(m.userProgress[0] || {}),
      progressPercentage: m.userProgress[0]?.progressPercentage || 0,
      startedAt: m.userProgress[0]?.startedAt || null,
      completedAt: m.userProgress[0]?.completedAt || null,
      lastAccessedAt: m.userProgress[0]?.lastAccessedAt || null
    }))
  };
};

// Détail de progression d'un utilisateur pour un sous-thème.
exports.getUserSubThemeProgress = async (userId, subThemeId) => {
  const progress = await prisma.userSubThemeProgress.findUnique({ where: { userId_subThemeId: { userId, subThemeId } } });
  const result = progress || { userId, subThemeId, progressPercentage: 0, completedContentIds: [], evaluationScore: null };
  return { ...result, state: exports.deriveState(result) };
};

// Suggère le prochain sous-thème à faire pour un utilisateur sur un niveau —
// purement indicatif, ne bloque jamais l'accès aux autres sous-thèmes.
// Ordre naturel : Module.index -> Theme.index -> SubTheme.index. Le premier
// sous-thème actif dont la progression est < 100% (ou jamais commencé) est
// suggéré ; si tout est terminé, retourne subTheme: null.
exports.getNextRecommendedSubTheme = async (userId, levelId) => {
  const level = await prisma.level.findUnique({ where: { id: levelId } });
  if (!level) throw new Error('Niveau non trouvé');

  const modules = await prisma.module.findMany({
    where: { levelId, isActive: true },
    orderBy: { index: 'asc' },
    select: {
      id: true, title: true, index: true,
      themes: {
        where: { isActive: true },
        orderBy: { index: 'asc' },
        select: {
          id: true, title: true, index: true,
          subThemes: { where: { isActive: true }, orderBy: { index: 'asc' }, select: { id: true, title: true, index: true } }
        }
      }
    }
  });

  // Aplatit la hiérarchie en une liste ordonnée module -> theme -> subTheme
  const orderedSubThemes = [];
  for (const module_ of modules) {
    for (const theme of module_.themes) {
      for (const subTheme of theme.subThemes) {
        orderedSubThemes.push({ module: module_, theme, subTheme });
      }
    }
  }

  if (orderedSubThemes.length === 0) {
    return { subTheme: null, theme: null, module: null, progressPercentage: 0, message: 'Aucun contenu disponible pour ce niveau.' };
  }

  const progresses = await prisma.userSubThemeProgress.findMany({
    where: { userId, subThemeId: { in: orderedSubThemes.map(e => e.subTheme.id) } },
    select: { subThemeId: true, progressPercentage: true }
  });
  const progressMap = new Map(progresses.map(p => [p.subThemeId, Number(p.progressPercentage)]));

  const next = orderedSubThemes.find(e => (progressMap.get(e.subTheme.id) || 0) < 100);

  if (!next) {
    return { subTheme: null, theme: null, module: null, progressPercentage: 100, message: 'Niveau terminé — tous les sous-thèmes sont complétés.' };
  }

  return {
    subTheme: { id: next.subTheme.id, title: next.subTheme.title, index: next.subTheme.index },
    theme: { id: next.theme.id, title: next.theme.title },
    module: { id: next.module.id, title: next.module.title },
    progressPercentage: progressMap.get(next.subTheme.id) || 0,
    message: `Continuez avec "${next.subTheme.title}".`
  };
};

// Point d'entrée unique pour les modules de contenu : recalcule le sous-thème
// PUIS propage jusqu'au module et au niveau, pour que les % restent à jour
// à tous les étages sans que chaque appelant ait à connaître la chaîne complète.
exports.recalculateFullChain = async (userId, subThemeId, options = {}) => {
  const subThemeProgress = await exports.recalculateSubThemeProgress(userId, subThemeId, options);

  const subTheme = await prisma.subTheme.findUnique({
    where: { id: subThemeId },
    select: { theme: { select: { moduleId: true } } }
  });

  const moduleAndLevelProgress = subTheme?.theme?.moduleId
    ? await exports.recalculateModuleAndLevelProgress(userId, subTheme.theme.moduleId)
    : null;

  return { subThemeProgress, ...moduleAndLevelProgress };
};
