const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');
const { notifyLearnersNewContent } = require('../../utils/contentNotifier');
const { syncAllUsersProgression } = require('../../utils/progressionSync');
const { deriveState } = require('../progress/progress.service');

// Récupérer tous les modules liés à un utilisateur (via userModuleProgress) — accès libre, aucun blocage
exports.getModulesByUserId = async (userId, levelId = null) => {
  let targetLevelId = levelId;

  if (!targetLevelId) {
    const userLevelProgress = await prisma.userLevelProgress.findFirst({
      where: { userId },
      orderBy: { lastAccessedAt: 'desc' }
    });
    if (!userLevelProgress) return [];
    targetLevelId = userLevelProgress.levelId;
  }

  return cacheWrap(`user:${userId}:modules:level:${targetLevelId}`, async () => {
    const modules = await prisma.module.findMany({
      where: { levelId: targetLevelId, isActive: true },
      orderBy: { index: 'asc' },
      include: { userProgress: { where: { userId }, select: { progressPercentage: true, startedAt: true, completedAt: true, lastAccessedAt: true } } }
    });

    return modules.map(module => ({
      id: module.id,
      title: module.title,
      description: module.description,
      index: module.index,
      thumbnailUrl: module.thumbnailUrl,
      isActive: module.isActive,
      progress: module.userProgress[0] || null,
      state: deriveState(module.userProgress[0] || {}),
      progressPercentage: module.userProgress[0]?.progressPercentage || 0,
      startedAt: module.userProgress[0]?.startedAt || null,
      completedAt: module.userProgress[0]?.completedAt || null,
      lastAccessedAt: module.userProgress[0]?.lastAccessedAt || null
    }));
  }, TTL.SHORT);
};

exports.startModuleForUser = async (userId, moduleId) => {
  const [mod, progress] = await Promise.all([
    prisma.module.findUnique({ where: { id: moduleId }, select: { levelId: true } }),
    prisma.userModuleProgress.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: { startedAt: new Date(), lastAccessedAt: new Date() },
      create: { userId, moduleId, startedAt: new Date(), lastAccessedAt: new Date() }
    }),
  ]);

  if (mod) await cacheDel(`user:${userId}:modules:level:${mod.levelId}`);

  const { status, ...rest } = progress;
  return { ...rest, state: deriveState(rest) };
};

exports.completeModuleForUser = async (userId, moduleId) => {
  const mod = await prisma.module.findUnique({ where: { id: moduleId }, select: { levelId: true } });
  if (mod) await cacheDel(`user:${userId}:modules:level:${mod.levelId}`);
  const progress = await prisma.userModuleProgress.update({
    where: { userId_moduleId: { userId, moduleId } },
    data: { completedAt: new Date(), progressPercentage: 100 }
  });
  const { status, ...rest } = progress;
  return { ...rest, state: deriveState(rest) };
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

  // Sync arrière-plan : recalcul progression + déblocage + cache pour tous les utilisateurs
  syncAllUsersProgression({ moduleId: created.id, levelId: created.levelId, languageId: level.languageId }, 'create').catch(() => {});
  notifyLearnersNewContent('module', { id: created.id, title: created.title }).catch(() => {});

  return created;
};

exports.getAll = async () => {
  return await prisma.module.findMany({ orderBy: { index: 'asc' } });
};

exports.getById = async (id) => {
  return await prisma.module.findUnique({ where: { id } });
};

exports.update = async (id, data) => {
  const before = await prisma.module.findUnique({
    where: { id },
    select: { levelId: true, level: { select: { languageId: true } } }
  });
  const updated = await prisma.module.update({ where: { id }, data });
  if (before) {
    syncAllUsersProgression({ moduleId: id, levelId: before.levelId, languageId: before.level?.languageId }, 'update').catch(() => {});
  }
  return updated;
};

exports.remove = async (id) => {
  const module = await prisma.module.findUnique({
    where: { id },
    select: { levelId: true, level: { select: { languageId: true } } }
  });
  if (!module) return null;
  await prisma.module.delete({ where: { id } });
  syncAllUsersProgression({ moduleId: id, levelId: module.levelId, languageId: module.level?.languageId }, 'delete').catch(() => {});
  return true;
};
