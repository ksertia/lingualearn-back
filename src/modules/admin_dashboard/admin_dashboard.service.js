const { prisma } = require('../../config/prisma');


async function getDashboardStats(filters = {}) {
  // Préparation des filtres dynamiques
  const userWhere = {};
  if (filters.userType) userWhere.accountType = filters.userType;
  if (filters.isActive !== undefined) userWhere.isActive = filters.isActive;
  if (filters.isVerified !== undefined) userWhere.isVerified = filters.isVerified;
  if (filters.withSubscription) userWhere.subscriptionId = { not: null };
  if (filters.startDate || filters.endDate) {
    userWhere.createdAt = {};
    if (filters.startDate) userWhere.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) userWhere.createdAt.lte = new Date(filters.endDate);
  }

  // Utilisateurs
  const totalUsers = await prisma.user.count({ where: userWhere });
  const activeUsers = await prisma.user.count({ where: { ...userWhere, isActive: true } });
  const verifiedUsers = await prisma.user.count({ where: { ...userWhere, isVerified: true } });
  const adminUsers = await prisma.user.count({ where: { ...userWhere, accountType: 'admin' } });
  const subAccounts = await prisma.user.count({ where: { ...userWhere, accountType: 'sub_account' } });
  const usersWithSubscription = await prisma.user.count({ where: { ...userWhere, subscriptionId: { not: null } } });

  // Parcours
  const totalLearningPaths = await prisma.learningPath.count();
  // Niveaux
  const totalLevels = await prisma.level.count();
  // Étapes
  const totalSteps = await prisma.step.count();
  // Leçons
  const totalLessons = await prisma.lesson.count();
  // Exercices
  const totalExercises = await prisma.exercise.count();
  // Quiz d'étape
  const totalStepQuizzes = await prisma.stepQuiz.count();

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      verified: verifiedUsers,
      admin: adminUsers,
      subAccounts,
      withSubscription: usersWithSubscription
    },
    learningPaths: totalLearningPaths,
    levels: totalLevels,
    steps: totalSteps,
    lessons: totalLessons,
    exercises: totalExercises,
    stepQuizzes: totalStepQuizzes
  };
}

module.exports = {
  getDashboardStats
};
