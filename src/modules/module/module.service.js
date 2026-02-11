const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

// Récupérer tous les modules liés à un utilisateur (via userModuleProgress)
exports.getModulesByUserId = async (userId) => {
  return await prisma.userModuleProgress.findMany({
    where: { userId },
    include: { module: true }
  });
};

// Progression utilisateur pour Module
exports.selectModuleForUser = async (userId, moduleId) => {
  let progress = await prisma.userModuleProgress.findUnique({ where: { userId_moduleId: { userId, moduleId } } });
  if (!progress) {
    progress = await prisma.userModuleProgress.create({ data: { userId, moduleId, status: 'locked' } });
  }
  return progress;
};

exports.startModuleForUser = async (userId, moduleId) => {
  return prisma.userModuleProgress.update({
    where: { userId_moduleId: { userId, moduleId } },
    data: { status: 'started', startedAt: new Date() }
  });
};

exports.completeModuleForUser = async (userId, moduleId) => {
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
