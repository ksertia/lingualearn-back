const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

// Récupérer tous les modules liés à un utilisateur (via userModuleProgress)
exports.getModulesByUserId = async (userId, levelId = null) => {
  let targetLevelId = levelId;

  if (!targetLevelId) {
    const userLevelProgress = await prisma.userLevelProgress.findFirst({
      where: { userId, status: { in: ['unlocked', 'started', 'completed'] } },
      orderBy: { lastAccessedAt: 'desc' }
    });
    if (!userLevelProgress) return [];
    targetLevelId = userLevelProgress.levelId;
  }

  return cacheWrap(`user:${userId}:modules:level:${targetLevelId}`, async () => {
    const modules = await prisma.module.findMany({
      where: { levelId: targetLevelId },
      orderBy: { index: 'asc' },
      include: { userProgress: { where: { userId } } }
    });

    return modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description,
      index: module.index,
      thumbnailUrl: module.thumbnailUrl,
      estimatedHours: module.estimatedHours,
      isActive: module.isActive,
      progress: module.userProgress[0] || null,
      status: module.userProgress[0]?.status || 'locked',
      progressPercentage: module.userProgress[0]?.progressPercentage || 0,
      totalXp: module.userProgress[0]?.totalXp || 0,
      timeSpentMinutes: module.userProgress[0]?.timeSpentMinutes || 0,
      unlockedAt: module.userProgress[0]?.unlockedAt || null,
      startedAt: module.userProgress[0]?.startedAt || null,
      completedAt: module.userProgress[0]?.completedAt || null,
      lastAccessedAt: module.userProgress[0]?.lastAccessedAt || null
    }));
  }, TTL.SHORT);
};

exports.startModuleForUser = async (userId, moduleId) => {
  // Charger module + premier path + upsert progression en parallèle
  const [mod, firstPath, progress] = await Promise.all([
    prisma.module.findUnique({ where: { id: moduleId }, select: { levelId: true } }),
    prisma.path.findFirst({ where: { moduleId }, orderBy: { index: 'asc' }, select: { id: true } }),
    prisma.userModuleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: { status: 'started', startedAt: new Date(), lastAccessedAt: new Date() },
      create: { userId, moduleId, status: 'started', startedAt: new Date(), lastAccessedAt: new Date() }
    }),
  ]);

  // Invalider cache + débloquer premier path en parallèle
  await Promise.all([
    mod ? cacheDel(`user:${userId}:modules:level:${mod.levelId}`) : Promise.resolve(),
    firstPath ? prisma.userPathProgress.upsert({
      where: { userId_pathId: { userId, pathId: firstPath.id } },
      update: { status: 'unlocked', unlockedAt: new Date(), lastAccessedAt: new Date() },
      create: { userId, pathId: firstPath.id, status: 'unlocked', unlockedAt: new Date(), lastAccessedAt: new Date() }
    }) : Promise.resolve(),
  ]);

  return progress;
};

exports.completeModuleForUser = async (userId, moduleId) => {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { levelId: true } });
  if (mod) await cacheDel(`user:${userId}:modules:level:${mod.levelId}`);
  return prisma.userModuleProgress.update({
    where: { userId_moduleId: { userId, moduleId } },
    data: { status: 'completed', completedAt: new Date() }
  });
};

// Compléter un module avec déblocage automatique du suivant
exports.completeModuleWithAutoUnlock = async (userId, moduleId) => {
  return await progressionService.completeModuleAndUnlockNext(userId, moduleId);
};

exports.create = async (data) => {
  // Vérifier que le levelId existe
  if (!data.levelId) {
    throw new Error('levelId est requis');
  }
  const level = await prisma.level.findUnique({ where: { id: data.levelId } });
  if (!level) {
    throw new Error('Le levelId fourni n\'existe pas');
  }

  // Auto-incrémenter l'index si null ou undefined
  if (data.index === null || data.index === undefined) {
    const lastModule = await prisma.module.findFirst({
      where: { levelId: data.levelId },
      orderBy: { index: 'desc' }
    });
    data.index = lastModule ? lastModule.index + 1 : 0;
  }

  return await prisma.module.create({ data });
};

exports.getAll = async () => {
  return await prisma.module.findMany({ orderBy: { index: 'asc' } });
};

exports.getById = async (id) => {
  return await prisma.module.findUnique({ where: { id } });
};

exports.update = async (id, data) => {
  return await prisma.module.update({ where: { id }, data });
};

exports.remove = async (id) => {
  const module = await prisma.module.findUnique({ where: { id } });
  if (!module) return null;
  await prisma.module.delete({ where: { id } });
  return true;
};
