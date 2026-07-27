const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheDel } = require('../../utils/cache');
const { notifyLearnersNewContent } = require('../../utils/contentNotifier');
const { logger } = require('../../utils/logger');
const { rewardParrainIfEligible } = require('../referral/referral.service');
const { recordCoinTransaction } = require('../transaction/transaction.service');

// Types de sections valides et leur ordre naturel
const SECTION_TYPES = ['introduction', 'main', 'transcript', 'example', 'example_audio', 'key_points'];
const CONTENT_TYPES = ['text', 'video', 'audio', 'pdf', 'image'];

const LESSON_SELECT = {
  id: true, title: true, summary: true, index: true, stepId: true, isActive: true,
  blocks: {
    orderBy: { index: 'asc' },
    select: { id: true, sectionType: true, contentType: true, content: true, caption: true, index: true }
  }
};

// ─── LEÇON CRUD ────────────────────────────────────────────────────────────────

exports.createCourse = async (data) => {
  logger.info('[createCourse service] data reçu: ' + JSON.stringify(data));

  const lastLesson = await prisma.lesson.findFirst({ where: { stepId: data.stepId }, orderBy: { index: 'desc' } });
  const lessonIndex = lastLesson ? lastLesson.index + 1 : 1;

  const created = await prisma.lesson.create({
    data: {
      stepId:  data.stepId,
      title:   data.title,
      summary: data.summary || null,
      index:   lessonIndex,
      isActive: true
    },
    include: { blocks: true }
  });

  notifyLearnersNewContent('course', { id: created.id, title: created.title }).catch(() => {});
  return created;
};

exports.getCourse = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id }, include: { blocks: { orderBy: { index: 'asc' } } } });
  if (!lesson) throw new Error('Leçon non trouvée');
  return lesson;
};

exports.updateCourse = async (id, data) => {
  logger.info('[updateCourse service] id: ' + id + ' | data reçu: ' + JSON.stringify(data));
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Leçon non trouvée');

  const validData = {};
  if (data.title   !== undefined) validData.title   = data.title;
  if (data.summary !== undefined) validData.summary = data.summary;
  if (data.isActive !== undefined) validData.isActive = data.isActive;

  return prisma.lesson.update({ where: { id }, data: validData, include: { blocks: { orderBy: { index: 'asc' } } } });
};

exports.patchCourse = exports.updateCourse;

exports.deleteCourse = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Leçon non trouvée');
  return prisma.lesson.delete({ where: { id } });
};

exports.duplicateCourse = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id }, include: { blocks: true } });
  if (!lesson) throw new Error('Leçon non trouvée');

  const copy = await prisma.lesson.create({
    data: {
      stepId:   lesson.stepId,
      title:    lesson.title + ' (copie)',
      summary:  lesson.summary,
      index:    lesson.index + 1,
      isActive: false
    }
  });

  if (lesson.blocks.length > 0) {
    await prisma.lessonBlock.createMany({
      data: lesson.blocks.map(b => ({
        lessonId:    copy.id,
        sectionType: b.sectionType,
        contentType: b.contentType,
        content:     b.content,
        caption:     b.caption,
        index:       b.index
      }))
    });
  }

  return prisma.lesson.findUnique({ where: { id: copy.id }, include: { blocks: { orderBy: { index: 'asc' } } } });
};

exports.toggleCoursePublish = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Leçon non trouvée');
  return prisma.lesson.update({ where: { id }, data: { isActive: !lesson.isActive }, include: { blocks: { orderBy: { index: 'asc' } } } });
};

// ─── BLOCS ─────────────────────────────────────────────────────────────────────

exports.addBlock = async (lessonId, data) => {
  if (!SECTION_TYPES.includes(data.sectionType))
    throw new Error(`sectionType invalide. Valeurs: ${SECTION_TYPES.join(', ')}`);
  if (!CONTENT_TYPES.includes(data.contentType))
    throw new Error(`contentType invalide. Valeurs: ${CONTENT_TYPES.join(', ')}`);

  return prisma.$transaction(async (tx) => {
    const lesson = await tx.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new Error('Leçon non trouvée');

    // Auto-index calculé et créé dans la même transaction pour éviter les doublons concurrents
    const last = await tx.lessonBlock.findFirst({ where: { lessonId }, orderBy: { index: 'desc' } });
    const index = data.index !== undefined ? data.index : (last ? last.index + 1 : 0);

    return tx.lessonBlock.create({
      data: {
        lessonId,
        sectionType: data.sectionType,
        contentType: data.contentType,
        content:     data.content,
        caption:     data.caption || null,
        index
      }
    });
  });
};

exports.updateBlock = async (blockId, data) => {
  const block = await prisma.lessonBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new Error('Bloc non trouvé');

  if (data.sectionType && !SECTION_TYPES.includes(data.sectionType))
    throw new Error(`sectionType invalide. Valeurs: ${SECTION_TYPES.join(', ')}`);
  if (data.contentType && !CONTENT_TYPES.includes(data.contentType))
    throw new Error(`contentType invalide. Valeurs: ${CONTENT_TYPES.join(', ')}`);

  const validData = {};
  if (data.sectionType !== undefined) validData.sectionType = data.sectionType;
  if (data.contentType !== undefined) validData.contentType = data.contentType;
  if (data.content     !== undefined) validData.content     = data.content;
  if (data.caption     !== undefined) validData.caption     = data.caption;
  if (data.index       !== undefined) validData.index       = data.index;

  return prisma.lessonBlock.update({ where: { id: blockId }, data: validData });
};

exports.deleteBlock = async (blockId) => {
  const block = await prisma.lessonBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new Error('Bloc non trouvé');
  return prisma.lessonBlock.delete({ where: { id: blockId } });
};

exports.reorderBlocks = async (lessonId, orderedIds) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) throw new Error('Leçon non trouvée');

  const existingBlocks = await prisma.lessonBlock.findMany({
    where: { lessonId },
    select: { id: true }
  });
  const validIds = new Set(existingBlocks.map(b => b.id));

  if (orderedIds.length !== existingBlocks.length || !orderedIds.every(id => validIds.has(id))) {
    throw new Error('orderedIds doit contenir exactement les blocs de cette leçon');
  }

  await prisma.$transaction([
    // Décalage temporaire hors de la plage [0, n) pour éviter les collisions
    // avec la contrainte unique (lessonId, index) pendant le réordonnancement
    ...orderedIds.map((id, i) =>
      prisma.lessonBlock.update({ where: { id }, data: { index: i + existingBlocks.length } })
    ),
    ...orderedIds.map((id, i) =>
      prisma.lessonBlock.update({ where: { id }, data: { index: i } })
    )
  ]);

  return prisma.lesson.findUnique({ where: { id: lessonId }, include: { blocks: { orderBy: { index: 'asc' } } } });
};

// ─── LECTURE ───────────────────────────────────────────────────────────────────

exports.getLessonsByStep = async (stepId, userId = null) => {
  const [lesson, userProgress] = await Promise.all([
    prisma.lesson.findUnique({
      where: { stepId },
      include: {
        step: { select: { id: true, title: true, description: true, estimatedMinutes: true } },
        blocks: { orderBy: { index: 'asc' } }
      }
    }),
    userId
      ? prisma.userStepProgress.findUnique({
          where: { userId_stepId: { userId, stepId } },
          select: { status: true, progressPercentage: true, score: true, startedAt: true, completedAt: true }
        })
      : Promise.resolve(null)
  ]);

  if (!lesson) return null;

  // Regrouper les blocs par section pour une lecture claire côté frontend
  const sections = {};
  for (const block of lesson.blocks) {
    if (!sections[block.sectionType]) sections[block.sectionType] = [];
    sections[block.sectionType].push(block);
  }

  return {
    id: lesson.id, title: lesson.title, summary: lesson.summary,
    index: lesson.index, stepId: lesson.stepId, isActive: lesson.isActive,
    blocks: lesson.blocks,
    sections,
    stepInfo: { id: lesson.step.id, title: lesson.step.title, description: lesson.step.description, estimatedMinutes: lesson.step.estimatedMinutes },
    userProgress: userProgress || null
  };
};

exports.getCourses = async (filters = {}) => {
  const { page = 1, limit = 20, search, stepId, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  const where = {};
  if (stepId) where.stepId = stepId;
  if (search) where.title = { contains: search };

  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    prisma.lesson.count({ where }),
    prisma.lesson.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder }, include: { blocks: { orderBy: { index: 'asc' } } } })
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

exports.getCoursesByUserId = async (userId) => {
  const userPathProgress = await prisma.userPathProgress.findFirst({
    where: { userId, status: { in: ['unlocked', 'started'] } },
    orderBy: { lastAccessedAt: 'desc' },
    select: { pathId: true }
  });
  if (!userPathProgress) return [];

  const [steps, userProgressList] = await Promise.all([
    prisma.step.findMany({
      where: { pathId: userPathProgress.pathId, stepType: 'lesson' },
      orderBy: { index: 'asc' },
      select: { id: true, title: true, index: true, estimatedMinutes: true, lesson: { select: LESSON_SELECT } }
    }),
    prisma.userStepProgress.findMany({
      where: { userId, step: { pathId: userPathProgress.pathId, stepType: 'lesson' } },
      select: { stepId: true, status: true, progressPercentage: true, score: true, completedAt: true }
    })
  ]);

  const progressMap = new Map(userProgressList.map(p => [p.stepId, p]));

  return steps.filter(s => s.lesson).map(step => {
    const prog = progressMap.get(step.id) || null;
    return {
      ...step.lesson,
      stepId: step.id, stepTitle: step.title, stepIndex: step.index,
      estimatedMinutes: step.estimatedMinutes,
      progress: prog,
      status: prog?.status || 'locked',
      progressValue: prog?.progressPercentage || 0,
      score: prog?.score || null,
      completedAt: prog?.completedAt || null
    };
  });
};

exports.getCoursesByLevel = async (levelId) => {
  return prisma.lesson.findMany({
    where: { step: { path: { module: { levelId } } } },
    include: { blocks: { orderBy: { index: 'asc' } } }
  });
};

// ─── COMPLÉTION ────────────────────────────────────────────────────────────────

exports.completeLessonForUser = async (lessonId, userId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { step: { select: { id: true, pathId: true, index: true } } }
  });
  if (!lesson) throw new Error('Leçon non trouvée');

  const earnedXp    = 10;
  const earnedCoins = 5;

  const [updatedProgress] = await Promise.all([
    prisma.userStepProgress.upsert({
      where: { userId_stepId: { userId, stepId: lesson.stepId } },
      update: { status: 'completed', progressPercentage: 100, completedAt: new Date() },
      create: { userId, stepId: lesson.stepId, status: 'completed', progressPercentage: 100, completedAt: new Date() }
    }),
    prisma.userStats.upsert({
      where: { userId },
      create: { userId, totalXp: earnedXp, totalCoins: earnedCoins, totalLessonsCompleted: 1 },
      update: { totalXp: { increment: earnedXp }, totalCoins: { increment: earnedCoins }, totalLessonsCompleted: { increment: 1 } }
    })
  ]);

  let nextStepUnlocked = null;
  try {
    await progressionService.completeStepAndUnlockNext(userId, lesson.stepId);
    const nextStep = await prisma.step.findFirst({
      where: { pathId: lesson.step.pathId, index: { gt: lesson.step.index }, isActive: true },
      orderBy: { index: 'asc' }, select: { id: true, title: true, index: true }
    });
    if (nextStep) nextStepUnlocked = { id: nextStep.id, title: nextStep.title, index: nextStep.index };
  } catch (_) {}

  cacheDel(`user:${userId}:state`, `gamification:user:${userId}:stats`).catch(() => {});
  rewardParrainIfEligible(userId).catch(() => {});
  recordCoinTransaction({
    userId,
    amountCoins: earnedCoins,
    transactionType: 'coin_earn',
    description: `Leçon complétée : ${lesson.title}`,
    referenceType: 'lesson',
    referenceId: lesson.id
  }).catch(() => {});

  return {
    lessonId: lesson.id, lessonTitle: lesson.title,
    stepProgress: updatedProgress,
    rewards: { xp: earnedXp, coins: earnedCoins },
    nextStepUnlocked,
    message: nextStepUnlocked
      ? `Leçon complétée ! Étape suivante débloquée : ${nextStepUnlocked.title}`
      : 'Leçon complétée avec succès !'
  };
};

exports.startCourseForUser = async (userId, courseId) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: courseId }, select: { stepId: true } });
  if (!lesson) throw new Error('Leçon non trouvée');
  return prisma.userStepProgress.update({
    where: { userId_stepId: { userId, stepId: lesson.stepId } },
    data: { status: 'started', startedAt: new Date() }
  });
};

exports.completeCourseForUser = async (userId, courseId) => {
  return exports.completeLessonForUser(courseId, userId);
};
