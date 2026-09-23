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

// Moyenne des % de tous les sous-thèmes d'un thème pour un utilisateur, remontée à UserThemeProgress.
// Le niveau (Level) se calcule directement à partir des thèmes — cette table sert
// uniquement à exposer une progression persistée par thème (start/complete explicites, affichage).
exports.recalculateThemeProgress = async (userId, themeId) => {
  const subThemes = await prisma.subTheme.findMany({
    where: { themeId, isActive: true },
    select: { id: true }
  });

  let themeProgress = 0;
  if (subThemes.length > 0) {
    const progresses = await prisma.userSubThemeProgress.findMany({
      where: { userId, subThemeId: { in: subThemes.map(s => s.id) } },
      select: { progressPercentage: true }
    });
    const sum = progresses.reduce((acc, p) => acc + Number(p.progressPercentage), 0);
    themeProgress = Math.round((sum / subThemes.length) * 100) / 100;
  }

  const now = new Date();
  const existing = await prisma.userThemeProgress.findUnique({ where: { userId_themeId: { userId, themeId } } });
  return prisma.userThemeProgress.upsert({
    where: { userId_themeId: { userId, themeId } },
    update: {
      progressPercentage: themeProgress,
      lastAccessedAt: now,
      startedAt: existing?.startedAt || (themeProgress > 0 ? now : null),
      completedAt: themeProgress >= 100 ? now : null
    },
    create: {
      userId, themeId,
      progressPercentage: themeProgress,
      startedAt: themeProgress > 0 ? now : null,
      lastAccessedAt: now,
      completedAt: themeProgress >= 100 ? now : null
    }
  });
};

// Moyenne des % de tous les thèmes d'un niveau pour un utilisateur, remontée à UserLevelProgress.
// Part directement de UserThemeProgress déjà à jour — l'appelant doit garantir que
// recalculateThemeProgress a été appelé avant pour le(s) thème(s) concerné(s).
exports.recalculateLevelProgress = async (userId, levelId) => {
  const level = await prisma.level.findUnique({ where: { id: levelId }, select: { id: true } });
  if (!level) throw new Error('Niveau non trouvé');

  const themes = await prisma.theme.findMany({ where: { levelId, isActive: true }, select: { id: true } });

  let levelProgress = 0;
  if (themes.length > 0) {
    const progresses = await prisma.userThemeProgress.findMany({
      where: { userId, themeId: { in: themes.map(t => t.id) } },
      select: { progressPercentage: true }
    });
    const sum = progresses.reduce((acc, p) => acc + Number(p.progressPercentage), 0);
    levelProgress = Math.round((sum / themes.length) * 100) / 100;
  }

  const now = new Date();
  await prisma.userLevelProgress.upsert({
    where: { userId_levelId: { userId, levelId } },
    update: { progressPercentage: levelProgress, lastAccessedAt: now, completedAt: levelProgress >= 100 ? now : null },
    create: { userId, levelId, progressPercentage: levelProgress, startedAt: now, lastAccessedAt: now }
  });

  return { levelProgress };
};

// Résumé de progression d'un utilisateur pour un level : liste des thèmes avec leur %.
exports.getUserLevelProgressSummary = async (userId, levelId) => {
  const level = await prisma.level.findUnique({ where: { id: levelId } });
  if (!level) throw new Error('Niveau non trouvé');

  const themes = await prisma.theme.findMany({
    where: { levelId, isActive: true },
    orderBy: { index: 'asc' },
    include: { userProgress: { where: { userId }, select: { progressPercentage: true, startedAt: true, completedAt: true, lastAccessedAt: true } } }
  });

  const levelProgress = await prisma.userLevelProgress.findUnique({ where: { userId_levelId: { userId, levelId } } });

  return {
    levelId,
    state: exports.deriveState(levelProgress || {}),
    progressPercentage: levelProgress?.progressPercentage || 0,
    themes: themes.map(t => ({
      id: t.id,
      title: t.title,
      state: exports.deriveState(t.userProgress[0] || {}),
      progressPercentage: t.userProgress[0]?.progressPercentage || 0,
      startedAt: t.userProgress[0]?.startedAt || null,
      completedAt: t.userProgress[0]?.completedAt || null,
      lastAccessedAt: t.userProgress[0]?.lastAccessedAt || null
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
// Ordre naturel : Theme.index -> SubTheme.index. Le premier
// sous-thème actif dont la progression est < 100% (ou jamais commencé) est
// suggéré ; si tout est terminé, retourne subTheme: null.
exports.getNextRecommendedSubTheme = async (userId, levelId) => {
  const level = await prisma.level.findUnique({ where: { id: levelId } });
  if (!level) throw new Error('Niveau non trouvé');

  const themes = await prisma.theme.findMany({
    where: { levelId, isActive: true },
    orderBy: { index: 'asc' },
    select: {
      id: true, title: true, index: true,
      subThemes: { where: { isActive: true }, orderBy: { index: 'asc' }, select: { id: true, title: true, index: true } }
    }
  });

  // Aplatit la hiérarchie en une liste ordonnée theme -> subTheme
  const orderedSubThemes = [];
  for (const theme of themes) {
    for (const subTheme of theme.subThemes) {
      orderedSubThemes.push({ theme, subTheme });
    }
  }

  if (orderedSubThemes.length === 0) {
    return { subTheme: null, theme: null, progressPercentage: 0, message: 'Aucun contenu disponible pour ce niveau.' };
  }

  const progresses = await prisma.userSubThemeProgress.findMany({
    where: { userId, subThemeId: { in: orderedSubThemes.map(e => e.subTheme.id) } },
    select: { subThemeId: true, progressPercentage: true }
  });
  const progressMap = new Map(progresses.map(p => [p.subThemeId, Number(p.progressPercentage)]));

  const next = orderedSubThemes.find(e => (progressMap.get(e.subTheme.id) || 0) < 100);

  if (!next) {
    return { subTheme: null, theme: null, progressPercentage: 100, message: 'Niveau terminé — tous les sous-thèmes sont complétés.' };
  }

  return {
    subTheme: { id: next.subTheme.id, title: next.subTheme.title, index: next.subTheme.index },
    theme: { id: next.theme.id, title: next.theme.title },
    progressPercentage: progressMap.get(next.subTheme.id) || 0,
    message: `Continuez avec "${next.subTheme.title}".`
  };
};

// Point d'entrée unique pour les modules de contenu : recalcule le sous-thème
// PUIS propage jusqu'au thème et au niveau, pour que les % restent à jour
// à tous les étages sans que chaque appelant ait à connaître la chaîne complète.
exports.recalculateFullChain = async (userId, subThemeId, options = {}) => {
  const subThemeProgress = await exports.recalculateSubThemeProgress(userId, subThemeId, options);

  const subTheme = await prisma.subTheme.findUnique({
    where: { id: subThemeId },
    select: { themeId: true, theme: { select: { levelId: true } } }
  });

  const themeProgress = subTheme?.themeId
    ? await exports.recalculateThemeProgress(userId, subTheme.themeId)
    : null;

  const levelProgress = subTheme?.theme?.levelId
    ? await exports.recalculateLevelProgress(userId, subTheme.theme.levelId)
    : null;

  return { subThemeProgress, themeProgress, ...levelProgress };
};
