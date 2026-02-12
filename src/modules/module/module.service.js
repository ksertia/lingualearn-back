const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

// Récupérer tous les modules liés à un utilisateur (via userModuleProgress)
exports.getModulesByUserId = async (userId) => {
  // 1. Trouver le niveau actuel de l'utilisateur
  const userLevelProgress = await prisma.userLevelProgress.findFirst({
    where: { 
      userId,
      status: { in: ['unlocked', 'started'] }  // Niveau actif
    },
    orderBy: { lastAccessedAt: 'desc' }
  });

  if (!userLevelProgress) {
    return [];  // Aucun niveau actif
  }

  // 2. Récupérer TOUS les modules du niveau avec leur progression
  const modules = await prisma.module.findMany({
    where: { levelId: userLevelProgress.levelId },
    orderBy: { index: 'asc' },
    include: {
      userProgress: {
        where: { userId }  // Progression si elle existe
      }
    }
  });

  // 3. Formater la réponse avec le statut
  return modules.map(module => ({
    id: module.id,
    title: module.title,
    description: module.description,
    index: module.index,
    thumbnailUrl: module.thumbnailUrl,
    estimatedHours: module.estimatedHours,
    isActive: module.isActive,
    
    // Progression (peut être null si jamais touché)
    progress: module.userProgress[0] || null,
    
    // Statut calculé
    status: module.userProgress[0]?.status || 'locked',
    progressPercentage: module.userProgress[0]?.progressPercentage || 0,
    totalXp: module.userProgress[0]?.totalXp || 0,
    timeSpentMinutes: module.userProgress[0]?.timeSpentMinutes || 0,
    unlockedAt: module.userProgress[0]?.unlockedAt || null,
    startedAt: module.userProgress[0]?.startedAt || null,
    completedAt: module.userProgress[0]?.completedAt || null,
    lastAccessedAt: module.userProgress[0]?.lastAccessedAt || null
  }));
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
  
  // Auto-incrémenter l'index si null ou undefined
  if (data.index === null || data.index === undefined) {
    // Récupérer le dernier module du niveau pour obtenir le dernier index
    const lastModule = await prisma.module.findFirst({
      where: { levelId: data.levelId },
      orderBy: { index: 'desc' }
    });
    
    // Si aucun module n'existe, commencer à 0, sinon incrémenter
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
