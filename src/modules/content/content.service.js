const { prisma } = require('../../config/prisma');
const { recalculateFullChain } = require('../progress/progress.service');
const { incrementExercisesCompleted, incrementLessonsCompleted } = require('../gamification/gamification.service');

const CONTENT_SELECT = {
  id: true, subThemeId: true, contentType: true, title: true, index: true, isActive: true,
  summary: true, videoUrl: true, description: true, keyPoints: true,
  statement: true, question: true, possibleAnswers: true, correctAnswer: true, explanation: true,
  resourceType: true, resourceUrl: true,
  blocks: { orderBy: { index: 'asc' } }
};

// ─── CONTENU ────────────────────────────────────────────────────────────────────

exports.createContent = async (data) => {
  const subTheme = await prisma.subTheme.findUnique({ where: { id: data.subThemeId } });
  if (!subTheme) throw new Error('Sous-thème non trouvé');

  return prisma.$transaction(async (tx) => {
    let index = data.index;
    if (index === undefined) {
      const last = await tx.content.findFirst({ where: { subThemeId: data.subThemeId }, orderBy: { index: 'desc' } });
      index = last ? last.index + 1 : 0;
    }

    return tx.content.create({
      data: { ...data, index, isActive: true },
      select: CONTENT_SELECT
    });
  });
};

exports.getContents = async (filters = {}) => {
  const { page = 1, limit = 20, search, subThemeId, contentType, sortBy = 'index', sortOrder = 'asc' } = filters;
  const where = {};
  if (subThemeId) where.subThemeId = subThemeId;
  if (contentType) where.contentType = contentType;
  if (search) where.title = { contains: search };

  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    prisma.content.count({ where }),
    prisma.content.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder }, select: CONTENT_SELECT })
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

exports.getContentsBySubThemeId = async (subThemeId) => {
  return prisma.content.findMany({ where: { subThemeId, isActive: true }, orderBy: { index: 'asc' }, select: CONTENT_SELECT });
};

exports.getContent = async (id) => {
  const content = await prisma.content.findUnique({ where: { id }, select: CONTENT_SELECT });
  if (!content) throw new Error('Contenu non trouvé');
  return content;
};

exports.updateContent = async (id, data) => {
  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) throw new Error('Contenu non trouvé');

  return prisma.content.update({ where: { id }, data, select: CONTENT_SELECT });
};

exports.deleteContent = async (id) => {
  const content = await prisma.content.findUnique({ where: { id } });
  if (!content) throw new Error('Contenu non trouvé');
  return prisma.content.delete({ where: { id } });
};

// ─── BLOCS (contentType = course uniquement) ───────────────────────────────────

exports.addBlock = async (contentId, data) => {
  return prisma.$transaction(async (tx) => {
    const content = await tx.content.findUnique({ where: { id: contentId } });
    if (!content) throw new Error('Contenu non trouvé');
    if (content.contentType !== 'course') throw new Error('Les blocs ne sont autorisés que pour un contenu de type "course"');

    const last = await tx.contentBlock.findFirst({ where: { contentId }, orderBy: { index: 'desc' } });
    const index = data.index !== undefined ? data.index : (last ? last.index + 1 : 0);

    return tx.contentBlock.create({
      data: {
        contentId,
        sectionType: data.sectionType,
        blockType:   data.blockType,
        content:     data.content,
        caption:     data.caption || null,
        index
      }
    });
  });
};

exports.updateBlock = async (blockId, data) => {
  const block = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new Error('Bloc non trouvé');

  const validData = {};
  ['sectionType', 'blockType', 'content', 'caption', 'index'].forEach(f => {
    if (data[f] !== undefined) validData[f] = data[f];
  });

  return prisma.contentBlock.update({ where: { id: blockId }, data: validData });
};

exports.deleteBlock = async (blockId) => {
  const block = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new Error('Bloc non trouvé');
  return prisma.contentBlock.delete({ where: { id: blockId } });
};

exports.reorderBlocks = async (contentId, orderedIds) => {
  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) throw new Error('Contenu non trouvé');

  const existingBlocks = await prisma.contentBlock.findMany({ where: { contentId }, select: { id: true } });
  const validIds = new Set(existingBlocks.map(b => b.id));

  if (orderedIds.length !== existingBlocks.length || !orderedIds.every(id => validIds.has(id))) {
    throw new Error('orderedIds doit contenir exactement les blocs de ce contenu');
  }

  await prisma.$transaction([
    ...orderedIds.map((id, i) => prisma.contentBlock.update({ where: { id }, data: { index: i + existingBlocks.length } })),
    ...orderedIds.map((id, i) => prisma.contentBlock.update({ where: { id }, data: { index: i } }))
  ]);

  return prisma.content.findUnique({ where: { id: contentId }, select: CONTENT_SELECT });
};

// ─── SOUMISSION D'EXERCICE ──────────────────────────────────────────────────────

exports.submitExercise = async (contentId, userId, answer) => {
  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) throw new Error('Contenu non trouvé');
  if (content.contentType !== 'exercise') throw new Error('Ce contenu n\'est pas un exercice');

  const attemptsCount = await prisma.contentAttempt.count({ where: { contentId, userId } });
  const attemptNumber = attemptsCount + 1;

  const isCorrect = JSON.stringify(answer) === JSON.stringify(content.correctAnswer);
  const score = isCorrect ? 100 : 0;

  const attempt = await prisma.contentAttempt.create({
    data: {
      contentId, userId, attemptNumber,
      answers: { answer },
      score, isCorrect
    }
  });

  // Marquer ce contenu comme complété et propager le % jusqu'au module/niveau (informatif, pas de blocage)
  await recalculateFullChain(userId, content.subThemeId, { completedContentId: isCorrect ? contentId : null }).catch(() => {});
  if (isCorrect) await incrementExercisesCompleted(userId).catch(() => {});

  return {
    attemptId: attempt.id,
    isCorrect, score, attemptNumber,
    explanation: content.explanation
  };
};

// ─── COMPLÉTION (course / video / resource) ────────────────────────────────────
// Marque un contenu non-exercice comme vu/consulté. Les exercices passent par
// submitExercise (leur complétion dépend de la justesse de la réponse).
exports.completeContent = async (contentId, userId) => {
  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) throw new Error('Contenu non trouvé');
  if (content.contentType === 'exercise') {
    throw new Error('Un exercice doit être complété via /submit, pas /complete');
  }

  const { subThemeProgress } = await recalculateFullChain(userId, content.subThemeId, { completedContentId: contentId });
  if (content.contentType === 'course') await incrementLessonsCompleted(userId).catch(() => {});

  return { contentId, subThemeId: content.subThemeId, progressPercentage: subThemeProgress.progressPercentage };
};

module.exports = exports;
