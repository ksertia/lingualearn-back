const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

// Récupérer toutes les étapes liées à un utilisateur (via userStepProgress)
exports.getStepsByUserId = async (userId) => {
  // 1. Trouver le parcours actuel de l'utilisateur
  const userPathProgress = await prisma.userPathProgress.findFirst({
    where: { 
      userId,
      status: { in: ['unlocked', 'started'] }  // Parcours actif
    },
    orderBy: { lastAccessedAt: 'desc' }
  });

  if (!userPathProgress) {
    return [];  // Aucun parcours actif
  }

  // 2. Récupérer TOUTES les étapes du parcours avec leur progression
  const steps = await prisma.step.findMany({
    where: { pathId: userPathProgress.pathId },
    orderBy: { index: 'asc' },
    include: {
      userProgress: {
        where: { userId }  // Progression si elle existe
      },
      lesson: {
        select: {
          id: true,
          title: true,
          content: true,
          videoUrl: true
        }
      },
      exercise: {
        select: {
          id: true,
          title: true,
          instructions: true,
          points: true,
          xpReward: true,
          coinReward: true
        }
      },
      quiz: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          timeLimitMinutes: true,
          xpReward: true,
          coinReward: true
        }
      }
    }
  });

  // 3. Formater la réponse avec le statut
  return steps.map(step => ({
    id: step.id,
    title: step.title,
    description: step.description,
    index: step.index,
    pathId: step.pathId,
    stepType: step.stepType,
    estimatedMinutes: step.estimatedMinutes,
    isActive: step.isActive,
    
    // Contenu selon le type
    lesson: step.lesson || null,
    exercise: step.exercise || null,
    quiz: step.quiz || null,
    
    // Progression (peut être null si jamais touché)
    progress: step.userProgress[0] || null,
    
    // Statut calculé
    status: step.userProgress[0]?.status || 'locked',
    progressValue: step.userProgress[0]?.progress || 0,
    score: step.userProgress[0]?.score || null,
    completedAt: step.userProgress[0]?.completedAt || null
  }));
};

exports.startStepForUser = async (userId, stepId) => {
  return prisma.userStepProgress.update({
    where: { userId_stepId: { userId, stepId } },
    data: { status: 'started', startedAt: new Date() }
  });
};

exports.completeStepForUser = async (userId, stepId) => {
  return prisma.userStepProgress.update({
    where: { userId_stepId: { userId, stepId } },
    data: { status: 'completed', completedAt: new Date() }
  });
};

// Compléter une étape avec déblocage automatique de la suivante
exports.completeStepWithAutoUnlock = async (userId, stepId) => {
  return await progressionService.completeStepAndUnlockNext(userId, stepId);
};

exports.create = async (data) => {
  // Only keep valid Step fields for Prisma
  const stepData = {
    pathId: data.pathId,
    title: data.title,
    description: data.description,
    stepType: data.stepType,
    index: typeof data.index === 'number' ? data.index : 0,
    estimatedMinutes: typeof data.estimatedMinutes === 'number' ? data.estimatedMinutes : 15,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : true
  };
  return prisma.step.create({ data: stepData });
};


exports.getAll = async () => {
  return prisma.step.findMany();
};


exports.getById = async (id) => {
  return prisma.step.findUnique({ where: { id } });
};


exports.update = async (id, data) => {
  // Only keep valid Step fields for Prisma
  const stepData = {};
  if (data.pathId) stepData.pathId = data.pathId;
  if (data.title) stepData.title = data.title;
  if (typeof data.description !== 'undefined') stepData.description = data.description;
  if (data.stepType) stepData.stepType = data.stepType;
  if (typeof data.index === 'number') stepData.index = data.index;
  if (typeof data.estimatedMinutes === 'number') stepData.estimatedMinutes = data.estimatedMinutes;
  if (typeof data.isActive === 'boolean') stepData.isActive = data.isActive;
  return prisma.step.update({ where: { id }, data: stepData });
};

exports.remove = async (id) => {
  try {
    await prisma.step.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
