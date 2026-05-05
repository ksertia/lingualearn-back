const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

const PATH_SELECT = {
  id: true, title: true, description: true, index: true, moduleId: true,
  thumbnailUrl: true, difficulty: true, estimatedHours: true, isActive: true
};

function _formatPath(path, progressMap) {
  const prog = progressMap.get(path.id) || null;
  return {
    ...path,
    progress: prog,
    status: prog?.status || 'locked',
    progressPercentage: prog?.progressPercentage || 0,
    currentStepIndex: prog?.currentStepIndex || 0,
    totalXp: prog?.totalXp || 0,
    timeSpentMinutes: prog?.timeSpentMinutes || 0,
    quizScore: prog?.quizScore || null,
    unlockedAt: prog?.unlockedAt || null,
    startedAt: prog?.startedAt || null,
    completedAt: prog?.completedAt || null,
    lastAccessedAt: prog?.lastAccessedAt || null
  };
}

async function getPathsByUserId(userId) {
  // Find active module + all paths + all user progress in 3 parallel queries
  const userModuleProgress = await prisma.userModuleProgress.findFirst({
    where: { userId, status: { in: ['unlocked', 'started'] } },
    orderBy: { lastAccessedAt: 'desc' },
    select: { moduleId: true }
  });

  if (!userModuleProgress) return [];

  const [paths, userProgressList] = await Promise.all([
    prisma.path.findMany({
      where: { moduleId: userModuleProgress.moduleId },
      orderBy: { index: 'asc' },
      select: PATH_SELECT
    }),
    prisma.userPathProgress.findMany({
      where: { userId, path: { moduleId: userModuleProgress.moduleId } },
      select: { pathId: true, status: true, progressPercentage: true, currentStepIndex: true, totalXp: true, timeSpentMinutes: true, quizScore: true, unlockedAt: true, startedAt: true, completedAt: true, lastAccessedAt: true }
    })
  ]);

  const progressMap = new Map(userProgressList.map(p => [p.pathId, p]));
  return paths.map(path => _formatPath(path, progressMap));
}

async function getPathsByModuleId(userId, moduleId) {
  // Cache static path list; user progress always fresh
  const [paths, userProgressList] = await Promise.all([
    cacheWrap(`paths:module:${moduleId}`, () =>
      prisma.path.findMany({ where: { moduleId }, orderBy: { index: 'asc' }, select: PATH_SELECT }),
      TTL.MEDIUM
    ),
    prisma.userPathProgress.findMany({
      where: { userId, path: { moduleId } },
      select: { pathId: true, status: true, progressPercentage: true, currentStepIndex: true, totalXp: true, timeSpentMinutes: true, quizScore: true, unlockedAt: true, startedAt: true, completedAt: true, lastAccessedAt: true }
    })
  ]);

  const progressMap = new Map(userProgressList.map(p => [p.pathId, p]));
  return paths.map(path => _formatPath(path, progressMap));
}

async function startPathForUser(userId, pathId) {
  // Upsert path progress + find first step in parallel
  const [progress, firstStep] = await Promise.all([
    prisma.userPathProgress.upsert({
      where: { userId_pathId: { userId, pathId } },
      update: { status: 'started', startedAt: new Date(), lastAccessedAt: new Date() },
      create: { userId, pathId, status: 'started', startedAt: new Date(), lastAccessedAt: new Date() }
    }),
    prisma.step.findFirst({
      where: { pathId }, orderBy: { index: 'asc' }, select: { id: true }
    })
  ]);

  if (firstStep) {
    await prisma.userStepProgress.upsert({
      where: { userId_stepId: { userId, stepId: firstStep.id } },
      update: { status: 'unlocked', unlockedAt: new Date(), lastAccessedAt: new Date() },
      create: { userId, stepId: firstStep.id, status: 'unlocked', unlockedAt: new Date(), lastAccessedAt: new Date() }
    });
  }

  return progress;
}

async function completePathForUser(userId, pathId) {
  return prisma.userPathProgress.update({
    where: { userId_pathId: { userId, pathId } },
    data: { status: 'completed', completedAt: new Date() }
  });
}

async function completePathWithAutoUnlock(userId, pathId) {
  return progressionService.completePathAndUnlockNext(userId, pathId);
}

async function createPath(data) {
  let index = data.index;
  if (index === undefined || index === null || typeof index !== 'number' || isNaN(index)) {
    const max = await prisma.path.aggregate({
      _max: { index: true },
      where: data.moduleId ? { moduleId: data.moduleId } : {}
    });
    index = (max._max.index ?? -1) + 1;
  }

  if (data.moduleId) {
    const existingIndex = await prisma.path.findFirst({ where: { moduleId: data.moduleId, index } });
    if (existingIndex) throw new Error('Un parcours avec ce même index existe déjà dans ce module.');
  }

  const path = await prisma.path.create({ data: { ...data, index } });
  if (data.moduleId) await cacheDel(`paths:module:${data.moduleId}`);
  return path;
}

async function getAllPaths() {
  return prisma.path.findMany();
}

async function getPathById(id) {
  return prisma.path.findUnique({ where: { id } });
}

async function updatePath(id, data) {
  if (data.index !== undefined && data.index !== null) {
    const path = await prisma.path.findUnique({ where: { id }, select: { moduleId: true } });
    if (!path) throw new Error('Parcours non trouvé.');
    if (path.moduleId) {
      const existingIndex = await prisma.path.findFirst({ where: { moduleId: path.moduleId, index: data.index, id: { not: id } } });
      if (existingIndex) throw new Error('Un parcours avec ce même index existe déjà dans ce module.');
    }
  }

  const updated = await prisma.path.update({ where: { id }, data });
  if (updated.moduleId) await cacheDel(`paths:module:${updated.moduleId}`);
  return updated;
}

async function deletePath(id) {
  const path = await prisma.path.findUnique({ where: { id }, select: { moduleId: true } });
  const deleted = await prisma.path.delete({ where: { id } });
  if (path?.moduleId) await cacheDel(`paths:module:${path.moduleId}`);
  return deleted;
}

module.exports = {
  createPath, getAllPaths, getPathById, updatePath, deletePath,
  getPathsByUserId, getPathsByModuleId,
  startPathForUser, completePathForUser, completePathWithAutoUnlock
};
