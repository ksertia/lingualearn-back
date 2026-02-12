const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

// Récupérer toutes les étapes liées à un utilisateur (via userStepProgress)
exports.getStepsByUserId = async (userId) => {
  return await prisma.userStepProgress.findMany({
    where: { userId },
    include: { step: true }
  });
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
