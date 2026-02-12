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


// Fonction utilitaire pour convertir les filtres
function parseBoolean(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value; // garde la valeur originale si ce n'est pas "true"/"false"
}

async function getTotalUsers(filters = {}) {
  const where = {};

  // Conversion explicite des booléens
  if (filters.userType) where.accountType = filters.userType;
  if (filters.isActive !== undefined) where.isActive = parseBoolean(filters.isActive);
  if (filters.isVerified !== undefined) where.isVerified = parseBoolean(filters.isVerified);
  if (filters.withSubscription !== undefined) {
    const withSub = parseBoolean(filters.withSubscription);
    if (withSub === true) where.subscriptionId = { not: null };
  }
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }

  return await prisma.user.count({ where });
}

// Total utilisateurs (avec filtres optionnels)
async function getTotalUsers(filters = {}) {
  const where = {};
  if (filters.userType) where.accountType = filters.userType;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;
  if (filters.withSubscription) where.subscriptionId = { not: null };
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }
  return await prisma.user.count({ where });
}

// Total des parcours
async function getTotalLearningPaths() {
  return await prisma.Path.count();
}

// Total des étapes
async function getTotalSteps() {
  return await prisma.step.count();
}

// Total des leçons
async function getTotalLessons() {
  return await prisma.lesson.count();
}

// Total des quiz d'étape
async function getTotalStepQuizzes() {
  return await prisma.Quiz.count();
}

// Total des niveaux (optionnel)
async function getTotalLevels() {
  return await prisma.level.count();
}

module.exports = {
  getDashboardStats,
  getTotalUsers,
  getTotalLearningPaths,
  getTotalSteps,
  getTotalLessons,
  getTotalStepQuizzes,
  getTotalLevels 
};
