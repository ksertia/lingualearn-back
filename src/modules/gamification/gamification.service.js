const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

// ==================== CONFIGURATION ====================

// Définition des badges disponibles
const BADGES = {
  FIRST_LESSON: {
    id: 'first_lesson',
    name: 'Premier Pas',
    description: 'Complétez votre première leçon',
    icon: '🎓',
    condition: (stats) => stats.totalLessonsCompleted >= 1
  },
  LESSONS_10: {
    id: 'lessons_10',
    name: 'Étudiant Assidu',
    description: 'Complétez 10 leçons',
    icon: '📚',
    condition: (stats) => stats.totalLessonsCompleted >= 10
  },
  EXERCISES_10: {
    id: 'exercises_10',
    name: 'Pratiquant',
    description: 'Réussissez 10 exercices',
    icon: '✍️',
    condition: (stats) => stats.totalExercisesCompleted >= 10
  },
  STREAK_7: {
    id: 'streak_7',
    name: 'Semaine Parfaite',
    description: '7 jours consécutifs d\'apprentissage',
    icon: '🔥',
    condition: (stats) => stats.currentStreak >= 7
  },
  STREAK_30: {
    id: 'streak_30',
    name: 'Champion de la Régularité',
    description: '30 jours consécutifs d\'apprentissage',
    icon: '⚡',
    condition: (stats) => stats.currentStreak >= 30
  },
  LEVEL_5: {
    id: 'level_5',
    name: 'Niveau 5',
    description: 'Atteignez le niveau 5',
    icon: '⭐',
    condition: (stats) => calculateLevel(Number(stats.totalXp)) >= 5
  },
  LEVEL_10: {
    id: 'level_10',
    name: 'Niveau 10',
    description: 'Atteignez le niveau 10',
    icon: '🌟',
    condition: (stats) => calculateLevel(Number(stats.totalXp)) >= 10
  },
  COINS_1000: {
    id: 'coins_1000',
    name: 'Millionnaire',
    description: 'Collectez 1000 coins',
    icon: '💎',
    condition: (stats) => stats.totalCoins >= 1000
  }
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Calcule le niveau basé sur l'XP total
 * Formule: level = floor(sqrt(totalXp / 100)) + 1
 */
function calculateLevel(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

/**
 * Calcule l'XP requis pour le prochain niveau
 */
function getXpForNextLevel(currentLevel) {
  return (currentLevel * currentLevel) * 100;
}

/**
 * Calcule l'XP requis pour atteindre le niveau actuel
 */
function getXpForCurrentLevel(currentLevel) {
  return ((currentLevel - 1) * (currentLevel - 1)) * 100;
}

// ==================== GESTION DES STATS ====================

/**
 * Récupère ou crée les stats d'un utilisateur
 */
async function getOrCreateUserStats(userId) {
  let stats = await prisma.userStats.findUnique({
    where: { userId }
  });

  if (!stats) {
    stats = await prisma.userStats.create({
      data: { userId }
    });
  }

  return stats;
}

/**
 * Récupère les stats complètes d'un utilisateur avec niveau et badges
 */
async function getUserStats(userId) {
  return cacheWrap(`gamification:user:${userId}:stats`, async () => {
    const stats = await getOrCreateUserStats(userId);
    const totalXp = Number(stats.totalXp);
    const currentLevel = calculateLevel(totalXp);
    const xpForCurrentLevel = getXpForCurrentLevel(currentLevel);
    const xpForNextLevel = getXpForNextLevel(currentLevel);
    const xpProgress = totalXp - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' }
    });

    return {
      userId: stats.userId,
      level: currentLevel,
      totalXp,
      xpForNextLevel,
      xpProgress,
      xpNeeded,
      progressPercentage: Math.round((xpProgress / xpNeeded) * 100),
      totalCoins: stats.totalCoins,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      totalStudyMinutes: stats.totalStudyMinutes,
      totalLessonsCompleted: stats.totalLessonsCompleted,
      totalExercisesCompleted: stats.totalExercisesCompleted,
      totalStepsCompleted: stats.totalStepsCompleted,
      accuracyRate: stats.accuracyRate ? Number(stats.accuracyRate) : 0,
      badges: userBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        earnedAt: ub.earnedAt
      })),
      totalBadges: userBadges.length,
      createdAt: stats.createdAt,
      updatedAt: stats.updatedAt
    };
  }, TTL.SHORT);
}

/**
 * Ajoute de l'XP et des coins à un utilisateur
 */
async function addRewards(userId, xp = 0, coins = 0) {
  await cacheDel(`gamification:user:${userId}:stats`, `gamification:user:${userId}:rank`, 'gamification:leaderboard');
  const stats = await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalXp: xp,
      totalCoins: coins
    },
    update: {
      totalXp: { increment: xp },
      totalCoins: { increment: coins }
    }
  });

  // Vérifier les nouveaux badges débloqués
  await checkAndAwardBadges(userId);

  return stats;
}

/**
 * Incrémente le compteur de leçons complétées
 */
async function incrementLessonsCompleted(userId) {
  await cacheDel(`gamification:user:${userId}:stats`);
  const stats = await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalLessonsCompleted: 1
    },
    update: {
      totalLessonsCompleted: { increment: 1 }
    }
  });

  await checkAndAwardBadges(userId);
  return stats;
}

/**
 * Incrémente le compteur d'exercices complétés
 */
async function incrementExercisesCompleted(userId) {
  await cacheDel(`gamification:user:${userId}:stats`);
  const stats = await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalExercisesCompleted: 1
    },
    update: {
      totalExercisesCompleted: { increment: 1 }
    }
  });

  await checkAndAwardBadges(userId);
  return stats;
}

// ==================== GESTION DES STREAKS ====================

/**
 * Met à jour le streak quotidien de l'utilisateur
 */
async function updateDailyStreak(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Vérifier l'activité d'aujourd'hui
  const todayActivity = await prisma.userDailyActivity.findUnique({
    where: {
      userId_activityDate: {
        userId,
        activityDate: today
      }
    }
  });

  // Si déjà enregistré aujourd'hui, ne rien faire
  if (todayActivity) {
    return;
  }

  // Créer l'activité du jour
  await prisma.userDailyActivity.create({
    data: {
      userId,
      activityDate: today,
      firstActivityAt: new Date(),
      lastActivityAt: new Date()
    }
  });

  // Récupérer les stats
  const stats = await getOrCreateUserStats(userId);

  // Vérifier l'activité d'hier
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayActivity = await prisma.userDailyActivity.findUnique({
    where: {
      userId_activityDate: {
        userId,
        activityDate: yesterday
      }
    }
  });

  let newStreak = 1;
  let streakBonus = 0;

  if (yesterdayActivity) {
    // Continuer le streak
    newStreak = stats.currentStreak + 1;
    streakBonus = 5; // Bonus XP pour maintenir le streak
  }

  // Mettre à jour les stats
  await prisma.userStats.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, stats.longestStreak),
      totalXp: { increment: streakBonus },
      totalCoins: { increment: Math.floor(streakBonus / 2) }
    }
  });

  // Vérifier les badges de streak
  await checkAndAwardBadges(userId);

  return { newStreak, streakBonus };
}

// ==================== GESTION DES BADGES ====================

/**
 * Vérifie et attribue les badges débloqués
 */
async function checkAndAwardBadges(userId) {
  const stats = await getOrCreateUserStats(userId);
  const newBadges = [];

  for (const [key, badgeConfig] of Object.entries(BADGES)) {
    // Vérifier si le badge est déjà attribué
    const existingBadge = await prisma.userBadge.findFirst({
      where: {
        userId,
        badge: {
          badgeKey: badgeConfig.id
        }
      }
    });

    if (!existingBadge && badgeConfig.condition(stats)) {
      // Créer ou récupérer le badge
      let badge = await prisma.badge.findUnique({
        where: { badgeKey: badgeConfig.id }
      });

      if (!badge) {
        badge = await prisma.badge.create({
          data: {
            badgeKey: badgeConfig.id,
            name: badgeConfig.name,
            description: badgeConfig.description,
            icon: badgeConfig.icon
          }
        });
      }

      // Attribuer le badge à l'utilisateur
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
          earnedAt: new Date()
        }
      });

      newBadges.push(badgeConfig);
    }
  }

  return newBadges;
}

/**
 * Récupère tous les badges disponibles
 */
async function getAllBadges() {
  return Object.values(BADGES).map(badge => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon
  }));
}

/**
 * Récupère les badges d'un utilisateur
 */
async function getUserBadges(userId) {
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' }
  });

  return userBadges.map(ub => ({
    id: ub.badge.badgeKey,
    name: ub.badge.name,
    description: ub.badge.description,
    icon: ub.badge.icon,
    earnedAt: ub.earnedAt
  }));
}

// ==================== LEADERBOARD ====================

/**
 * Récupère le classement des utilisateurs par XP
 */
async function getLeaderboard(limit = 10) {
  return cacheWrap(`gamification:leaderboard:${limit}`, async () => {
    const topUsers = await prisma.userStats.findMany({
      take: limit,
      orderBy: { totalXp: 'desc' },
      include: { user: { select: { id: true, username: true, profilePicture: true } } }
    });
    return topUsers.map((stats, index) => ({
      rank: index + 1,
      userId: stats.userId,
      username: stats.user.username,
      profilePicture: stats.user.profilePicture,
      level: calculateLevel(Number(stats.totalXp)),
      totalXp: Number(stats.totalXp),
      totalCoins: stats.totalCoins,
      currentStreak: stats.currentStreak
    }));
  }, TTL.SHORT);
}

/**
 * Récupère la position d'un utilisateur dans le classement
 */
async function getUserRank(userId) {
  return cacheWrap(`gamification:user:${userId}:rank`, async () => {
    const userStats = await getOrCreateUserStats(userId);
    const higherRanked = await prisma.userStats.count({ where: { totalXp: { gt: userStats.totalXp } } });
    return higherRanked + 1;
  }, TTL.SHORT);
}

module.exports = {
  // Stats
  getUserStats,
  getOrCreateUserStats,
  addRewards,
  incrementLessonsCompleted,
  incrementExercisesCompleted,
  
  // Streaks
  updateDailyStreak,
  
  // Badges
  checkAndAwardBadges,
  getAllBadges,
  getUserBadges,
  
  // Leaderboard
  getLeaderboard,
  getUserRank,
  
  // Utilitaires
  calculateLevel,
  getXpForNextLevel
};
