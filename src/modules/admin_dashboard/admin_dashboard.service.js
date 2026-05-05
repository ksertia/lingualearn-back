const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

function _buildUserWhere(filters = {}) {
  const where = {};
  if (filters.userType)  where.accountType = filters.userType;
  if (filters.isActive  !== undefined) where.isActive  = filters.isActive;
  if (filters.isVerified !== undefined) where.isVerified = filters.isVerified;
  if (filters.withSubscription) where.subscriptionId = { not: null };
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate);
  }
  return where;
}

// Cache key changes with filters — stable JSON stringify as suffix
function _dashboardCacheKey(filters) {
  const suffix = Object.keys(filters).length ? ':' + JSON.stringify(filters) : '';
  return `admin:dashboard:stats${suffix}`;
}

async function getDashboardStats(filters = {}) {
  return cacheWrap(_dashboardCacheKey(filters), async () => {
    const userWhere = _buildUserWhere(filters);

    // All 12 counts run in parallel — single round-trip per query, none sequential
    const [
      totalUsers, activeUsers, verifiedUsers, adminUsers, subAccounts, usersWithSubscription,
      totalLevels, totalSteps, totalLessons, totalExercises,
      totalPaths, totalModules
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.user.count({ where: { ...userWhere, isActive: true } }),
      prisma.user.count({ where: { ...userWhere, isVerified: true } }),
      prisma.user.count({ where: { ...userWhere, accountType: 'admin' } }),
      prisma.user.count({ where: { ...userWhere, accountType: 'sub_account' } }),
      prisma.user.count({ where: { ...userWhere, subscriptionId: { not: null } } }),
      prisma.level.count(),
      prisma.step.count(),
      prisma.lesson.count(),
      prisma.exercise.count(),
      prisma.path.count(),
      prisma.module.count(),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, verified: verifiedUsers, admin: adminUsers, subAccounts, withSubscription: usersWithSubscription },
      levels: totalLevels,
      steps: totalSteps,
      lessons: totalLessons,
      exercises: totalExercises,
      paths: totalPaths,
      modules: totalModules,
    };
  }, TTL.MEDIUM);
}

// Called externally when users/content are mutated — invalidates all dashboard caches
async function invalidateDashboardCache() {
  await cacheDel('admin:dashboard:stats');
}

function parseBoolean(value) {
  if (value === 'true')  return true;
  if (value === 'false') return false;
  return value;
}

async function getTotalUsers(filters = {}) {
  const where = _buildUserWhere({
    userType:         filters.userType,
    isActive:         filters.isActive  !== undefined ? parseBoolean(filters.isActive)  : undefined,
    isVerified:       filters.isVerified !== undefined ? parseBoolean(filters.isVerified) : undefined,
    withSubscription: filters.withSubscription,
    startDate:        filters.startDate,
    endDate:          filters.endDate,
  });
  return prisma.user.count({ where });
}

async function getTotalLearningPaths() { return prisma.path.count(); }
async function getTotalSteps()         { return prisma.step.count(); }
async function getTotalLessons()       { return prisma.lesson.count(); }
async function getTotalStepQuizzes()   { return prisma.quiz.count(); }
async function getTotalLevels()        { return prisma.level.count(); }

module.exports = {
  getDashboardStats,
  invalidateDashboardCache,
  getTotalUsers,
  getTotalLearningPaths,
  getTotalSteps,
  getTotalLessons,
  getTotalStepQuizzes,
  getTotalLevels,
};
