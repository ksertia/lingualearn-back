const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { invalidateStructureCache, provisionNewContent } = require('../progression/progression.service');
const { cacheWrap, cacheDel, cacheInvalidatePattern, TTL } = require('../../utils/cache');
const { notifyLearnersNewContent } = require('../../utils/contentNotifier');

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
      include: { userProgress: { where: { userId }, select: { status: true, progressPercentage: true, totalXp: true, timeSpentMinutes: true, unlockedAt: true, startedAt: true, completedAt: true, lastAccessedAt: true } } }
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
  if (!data.levelId) throw new Error('levelId est requis');
  const level = await prisma.level.findUnique({ where: { id: data.levelId }, select: { id: true, languageId: true } });
  if (!level) throw new Error('Le levelId fourni n\'existe pas');

  if (data.index === null || data.index === undefined) {
    const lastModule = await prisma.module.findFirst({
      where: { levelId: data.levelId }, orderBy: { index: 'desc' }
    });
    data.index = lastModule ? lastModule.index + 1 : 0;
  }

  const created = await prisma.module.create({ data });

  // Invalider cache structurel + créer lignes de progression pour utilisateurs existants
  await Promise.all([
    invalidateStructureCache({ moduleId: created.id, levelId: created.levelId, languageId: level.languageId }),
    cacheInvalidatePattern(`user:*:modules:level:${created.levelId}`),
    provisionNewContent({ moduleId: created.id, levelId: created.levelId, languageId: level.languageId }),
    notifyLearnersNewContent('module', { id: created.id, title: created.title }),
  ]).catch(() => {});

  return created;
};

exports.getAll = async () => {
  return await prisma.module.findMany({ orderBy: { index: 'asc' } });
};

exports.getById = async (id) => {
  return await prisma.module.findUnique({ where: { id } });
};

exports.update = async (id, data) => {
  const before = await prisma.module.findUnique({ where: { id }, select: { levelId: true } });
  const updated = await prisma.module.update({ where: { id }, data });
  if (before) {
    await Promise.all([
      invalidateStructureCache({ moduleId: id, levelId: before.levelId }),
      cacheInvalidatePattern(`user:*:modules:level:${before.levelId}`),
    ]).catch(() => {});
  }
  return updated;
};

exports.remove = async (id) => {
  const module = await prisma.module.findUnique({ where: { id }, select: { levelId: true } });
  if (!module) return null;
  await prisma.module.delete({ where: { id } });
  await Promise.all([
    invalidateStructureCache({ moduleId: id, levelId: module.levelId }),
    cacheInvalidatePattern(`user:*:modules:level:${module.levelId}`),
  ]).catch(() => {});
  return true;
};
