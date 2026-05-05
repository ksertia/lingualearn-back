const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

const STEP_CONTENT_SELECT = {
  id: true, title: true, description: true, index: true, pathId: true,
  stepType: true, estimatedMinutes: true, isActive: true,
  lesson:   { select: { id: true, title: true, content: true, videoUrl: true } },
  exercise: { select: { id: true, title: true, instructions: true, points: true, xpReward: true, coinReward: true } },
  quiz:     { select: { id: true, title: true, passingScore: true, timeLimitMinutes: true, xpReward: true, coinReward: true } }
};

function _formatStep(step, userId) {
  const prog = step.userProgress?.[0] || null;
  return {
    id: step.id, title: step.title, description: step.description,
    index: step.index, pathId: step.pathId, stepType: step.stepType,
    estimatedMinutes: step.estimatedMinutes, isActive: step.isActive,
    lesson: step.lesson || null, exercise: step.exercise || null, quiz: step.quiz || null,
    progress: prog,
    status: prog?.status || 'locked',
    progressValue: prog?.progress || 0,
    score: prog?.score || null,
    completedAt: prog?.completedAt || null
  };
}

exports.getStepsByUserId = async (userId, pathId) => {
  const userPathProgress = await prisma.userPathProgress.findFirst({
    where: { userId_pathId: { userId, pathId } },
    orderBy: { lastAccessedAt: 'desc' },
    select: { pathId: true }
  });
  if (!userPathProgress) return [];

  return exports.getStepsByPathId(userId, userPathProgress.pathId);
};

exports.getStepsByPathId = async (userId, pathId) => {
  // Fetch steps + user progress in 2 parallel queries (no nested include per-step = no N+1)
  const [steps, userProgressList] = await Promise.all([
    prisma.step.findMany({
      where: { pathId },
      orderBy: { index: 'asc' },
      select: { ...STEP_CONTENT_SELECT }
    }),
    prisma.userStepProgress.findMany({
      where: { userId, step: { pathId } },
      select: { stepId: true, status: true, progress: true, score: true, completedAt: true }
    })
  ]);

  const progressMap = new Map(userProgressList.map(p => [p.stepId, p]));

  return steps.map(step => {
    const prog = progressMap.get(step.id) || null;
    return {
      id: step.id, title: step.title, description: step.description,
      index: step.index, pathId: step.pathId, stepType: step.stepType,
      estimatedMinutes: step.estimatedMinutes, isActive: step.isActive,
      lesson: step.lesson || null, exercise: step.exercise || null, quiz: step.quiz || null,
      progress: prog,
      status: prog?.status || 'locked',
      progressValue: prog?.progress || 0,
      score: prog?.score || null,
      completedAt: prog?.completedAt || null
    };
  });
};

exports.getStepContent = async (stepId, userId = null) => {
  // Cache static step structure (changes rarely)
  const step = await cacheWrap(`step:${stepId}:content`, () =>
    prisma.step.findUnique({
      where: { id: stepId },
      include: {
        path: {
          select: {
            id: true, title: true, description: true,
            module: {
              select: {
                id: true, title: true,
                level: {
                  select: {
                    id: true, name: true, code: true,
                    language: { select: { id: true, name: true, code: true } }
                  }
                }
              }
            }
          }
        },
        lesson:   { select: { id: true, title: true, content: true, videoUrl: true, attachments: true, index: true } },
        exercise: { select: { id: true, title: true, instructions: true, content: true, hints: true, explanation: true, maxAttempts: true, points: true, xpReward: true, coinReward: true, correctAnswers: true } },
        quiz:     { select: { id: true, title: true, questions: true, passingScore: true, maxAttempts: true, timeLimitMinutes: true, xpReward: true, coinReward: true } }
      }
    }),
    TTL.MEDIUM
  );

  if (!step) throw new Error('Étape non trouvée');

  // User progress fetched separately (user-specific, not cached here)
  const userProgressRow = userId
    ? await prisma.userStepProgress.findUnique({
        where: { userId_stepId: { userId, stepId } },
        select: { status: true, progress: true, score: true, attempts: true, startedAt: true, completedAt: true }
      })
    : null;

  let content = null;
  const contentType = step.stepType;

  if (step.stepType === 'lesson' && step.lesson) {
    content = { ...step.lesson };
  } else if (step.stepType === 'exercise' && step.exercise) {
    const { correctAnswers, ...rest } = step.exercise;
    content = { ...rest, hasCorrectAnswers: !!correctAnswers };
  } else if (step.stepType === 'quiz' && step.quiz) {
    content = { ...step.quiz };
  }

  return {
    step: { id: step.id, title: step.title, description: step.description, stepType: step.stepType, index: step.index, estimatedMinutes: step.estimatedMinutes, isActive: step.isActive },
    content, contentType,
    path:     { id: step.path.id, title: step.path.title, description: step.path.description },
    module:   { id: step.path.module.id, title: step.path.module.title },
    level:    { id: step.path.module.level.id, name: step.path.module.level.name, code: step.path.module.level.code },
    language: { id: step.path.module.level.language.id, name: step.path.module.level.language.name, code: step.path.module.level.language.code },
    userProgress: userProgressRow || null
  };
};

exports.startStepForUser = async (userId, stepId) => {
  await cacheDel(`user:${userId}:state`);
  return prisma.userStepProgress.update({
    where: { userId_stepId: { userId, stepId } },
    data: { status: 'started', startedAt: new Date() }
  });
};

exports.completeStepForUser = async (userId, stepId) => {
  await cacheDel(`user:${userId}:state`);
  return prisma.userStepProgress.update({
    where: { userId_stepId: { userId, stepId } },
    data: { status: 'completed', completedAt: new Date() }
  });
};

exports.completeStepWithAutoUnlock = async (userId, stepId) => {
  await cacheDel(`user:${userId}:state`);
  return progressionService.completeStepAndUnlockNext(userId, stepId);
};

exports.create = async (data) => {
  const stepData = {
    pathId: data.pathId, title: data.title, description: data.description,
    stepType: data.stepType,
    index: typeof data.index === 'number' ? data.index : 0,
    estimatedMinutes: typeof data.estimatedMinutes === 'number' ? data.estimatedMinutes : 15,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : true
  };
  return prisma.step.create({ data: stepData });
};

exports.getAll = async () => prisma.step.findMany();

exports.getById = async (id) => prisma.step.findUnique({ where: { id } });

exports.update = async (id, data) => {
  await cacheDel(`step:${id}:content`);
  const stepData = {};
  if (data.pathId) stepData.pathId = data.pathId;
  if (data.title) stepData.title = data.title;
  if (data.description !== undefined) stepData.description = data.description;
  if (data.stepType) stepData.stepType = data.stepType;
  if (typeof data.index === 'number') stepData.index = data.index;
  if (typeof data.estimatedMinutes === 'number') stepData.estimatedMinutes = data.estimatedMinutes;
  if (typeof data.isActive === 'boolean') stepData.isActive = data.isActive;
  return prisma.step.update({ where: { id }, data: stepData });
};

exports.remove = async (id) => {
  try {
    await cacheDel(`step:${id}:content`);
    await prisma.step.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
