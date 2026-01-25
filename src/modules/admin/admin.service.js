const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// OPTION A: DASHBOARD - STATISTIQUES GLOBALES
// ============================================================================

/**
 * Récupérer les statistiques du dashboard admin
 */
const getDashboardStats = async () => {
  const [
    totalUsers,
    activeUsers7Days,
    activeUsers30Days,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    totalCourses,
    publishedCourses,
    totalLessons,
    totalExercises,
    totalLanguages,
    totalSubscriptions,
    activeSubscriptions,
    totalRevenue,
    topLanguages,
    recentActivity,
    userGrowth,
  ] = await Promise.all([
    // Total utilisateurs
    prisma.user.count(),
    
    // Utilisateurs actifs (7 derniers jours)
    prisma.user.count({
      where: {
        lastActive: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Utilisateurs actifs (30 derniers jours)
    prisma.user.count({
      where: {
        lastActive: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Nouveaux inscrits aujourd'hui
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    
    // Nouveaux inscrits cette semaine
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Nouveaux inscrits ce mois
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    
    // Total cours
    prisma.course.count(),
    
    // Cours publiés
    prisma.course.count({ where: { isPublished: true } }),
    
    // Total leçons
    prisma.lesson.count(),
    
    // Total exercices
    prisma.exercise.count(),
    
    // Total langues
    prisma.language.count({ where: { isActive: true } }),
    
    // Total abonnements
    prisma.subscription.count(),
    
    // Abonnements actifs
    prisma.subscription.count({ where: { status: 'active' } }),
    
    // Revenu total (simulation - à adapter selon votre logique)
    prisma.subscription.aggregate({
      _sum: { id: true },
    }),
    
    // Langues les plus étudiées
    prisma.userLanguageProgress.groupBy({
      by: ['languageId'],
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 5,
    }),
    
    // Activité récente (10 dernières actions)
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
    
    // Croissance utilisateurs (30 derniers jours)
    getUserGrowthData(),
  ]);

  // Enrichir les langues les plus étudiées
  const topLanguagesWithDetails = await Promise.all(
    topLanguages.map(async (item) => {
      const language = await prisma.language.findUnique({
        where: { id: item.languageId },
        select: { id: true, name: true, code: true, flagEmoji: true },
      });
      return {
        ...language,
        userCount: item._count.userId,
      };
    })
  );

  return {
    users: {
      total: totalUsers,
      active7Days: activeUsers7Days,
      active30Days: activeUsers30Days,
      newToday: newUsersToday,
      newWeek: newUsersWeek,
      newMonth: newUsersMonth,
      growth: userGrowth,
    },
    content: {
      totalCourses,
      publishedCourses,
      totalLessons,
      totalExercises,
      totalLanguages,
    },
    subscriptions: {
      total: totalSubscriptions,
      active: activeSubscriptions,
      revenue: totalRevenue || 0,
    },
    topLanguages: topLanguagesWithDetails,
    recentActivity,
  };
};

/**
 * Obtenir la croissance des utilisateurs (30 derniers jours)
 */
const getUserGrowthData = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const dailyUsers = await prisma.user.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  });

  // Formater les données par jour
  const growth = {};
  dailyUsers.forEach((item) => {
    const date = new Date(item.createdAt).toISOString().split('T')[0];
    growth[date] = (growth[date] || 0) + item._count.id;
  });

  return Object.entries(growth).map(([date, count]) => ({ date, count }));
};

// ============================================================================
// OPTION B: GESTION DES COURSES (CRUD COMPLET)
// ============================================================================

/**
 * Lister tous les cours avec filtres et pagination
 */
const getAllCourses = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    trackId,
    isPublished,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const skip = (page - 1) * limit;
  const where = {};

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { courseCode: { contains: search } },
    ];
  }

  if (trackId) where.trackId = trackId;
  if (isPublished !== undefined) where.isPublished = isPublished === 'true';

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        track: {
          include: {
            level: {
              include: { language: true },
            },
          },
        },
        lessons: {
          select: { id: true },
        },
        _count: {
          select: { lessons: true, userCourseProgress: true },
        },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return {
    data: courses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Obtenir un cours par ID
 */
const getCourseById = async (id) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      track: {
        include: {
          level: {
            include: { language: true },
          },
        },
      },
      lessons: {
        orderBy: { sortOrder: 'asc' },
        include: {
          exercises: {
            select: { id: true, exerciseType: true },
          },
        },
      },
      userCourseProgress: {
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  return course;
};

/**
 * Créer un nouveau cours
 */
const createCourse = async (data) => {
  const {
    trackId,
    courseNumber,
    title,
    description,
    thumbnailUrl,
    videoPreviewUrl,
    estimatedDurationMinutes,
    difficultyLevel,
    isPublished,
  } = data;

  // Vérifier que le track existe
  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) {
    throw new Error('Track not found');
  }

  // Générer le courseCode
  const courseCode = `${track.trackCode}-C${String(courseNumber).padStart(2, '0')}`;

  // Calculer le sortOrder
  const lastCourse = await prisma.course.findFirst({
    where: { trackId },
    orderBy: { sortOrder: 'desc' },
  });
  const sortOrder = lastCourse ? lastCourse.sortOrder + 1 : 1;

  const course = await prisma.course.create({
    data: {
      trackId,
      courseNumber,
      courseCode,
      title,
      description,
      thumbnailUrl,
      videoPreviewUrl,
      estimatedDurationMinutes: parseInt(estimatedDurationMinutes) || 60,
      difficultyLevel: difficultyLevel || 'beginner',
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : null,
      sortOrder,
    },
    include: {
      track: {
        include: {
          level: {
            include: { language: true },
          },
        },
      },
    },
  });

  return course;
};

/**
 * Mettre à jour un cours
 */
const updateCourse = async (id, data) => {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    throw new Error('Course not found');
  }

  const updateData = { ...data };

  // Si on publie le cours et qu'il ne l'était pas
  if (data.isPublished && !course.isPublished) {
    updateData.publishedAt = new Date();
  }

  const updatedCourse = await prisma.course.update({
    where: { id },
    data: updateData,
    include: {
      track: {
        include: {
          level: {
            include: { language: true },
          },
        },
      },
      lessons: true,
    },
  });

  return updatedCourse;
};

/**
 * Supprimer un cours
 */
const deleteCourse = async (id) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { userCourseProgress: true } } },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  // Vérifier s'il y a des utilisateurs qui ont commencé ce cours
  if (course._count.userCourseProgress > 0) {
    throw new Error(
      `Cannot delete course: ${course._count.userCourseProgress} users have started it`
    );
  }

  await prisma.course.delete({ where: { id } });

  return { message: 'Course deleted successfully' };
};

/**
 * Dupliquer un cours
 */
const duplicateCourse = async (id) => {
  const course = await prisma.course.findUnique({
    where: { id },
    include: { lessons: { include: { exercises: true } } },
  });

  if (!course) {
    throw new Error('Course not found');
  }

  // Trouver le prochain courseNumber disponible
  const lastCourse = await prisma.course.findFirst({
    where: { trackId: course.trackId },
    orderBy: { courseNumber: 'desc' },
  });
  const newCourseNumber = lastCourse ? lastCourse.courseNumber + 1 : 1;

  // Créer le nouveau cours
  const newCourse = await prisma.course.create({
    data: {
      trackId: course.trackId,
      courseNumber: newCourseNumber,
      courseCode: `${course.courseCode}-COPY`,
      title: `${course.title} (Copy)`,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      videoPreviewUrl: course.videoPreviewUrl,
      estimatedDurationMinutes: course.estimatedDurationMinutes,
      difficultyLevel: course.difficultyLevel,
      isPublished: false,
      sortOrder: (lastCourse?.sortOrder || 0) + 1,
    },
  });

  // Dupliquer les leçons
  for (const lesson of course.lessons) {
    const newLesson = await prisma.lesson.create({
      data: {
        courseId: newCourse.id,
        lessonNumber: lesson.lessonNumber,
        title: lesson.title,
        contentType: lesson.contentType,
        contentUrl: lesson.contentUrl,
        contentText: lesson.contentText,
        interactiveData: lesson.interactiveData,
        estimatedDurationMinutes: lesson.estimatedDurationMinutes,
        isFreePreview: lesson.isFreePreview,
        sortOrder: lesson.sortOrder,
      },
    });

    // Dupliquer les exercices
    for (const exercise of lesson.exercises) {
      await prisma.exercise.create({
        data: {
          lessonId: newLesson.id,
          exerciseType: exercise.exerciseType,
          title: exercise.title,
          instructions: exercise.instructions,
          content: exercise.content,
          correctAnswers: exercise.correctAnswers,
          hints: exercise.hints,
          points: exercise.points,
          xpReward: exercise.xpReward,
          coinReward: exercise.coinReward,
          maxAttempts: exercise.maxAttempts,
          timeLimitSeconds: exercise.timeLimitSeconds,
          sortOrder: exercise.sortOrder,
        },
      });
    }
  }

  return newCourse;
};

/**
 * Publier/Dépublier un cours
 */
const toggleCoursePublish = async (id) => {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    throw new Error('Course not found');
  }

  const updatedCourse = await prisma.course.update({
    where: { id },
    data: {
      isPublished: !course.isPublished,
      publishedAt: !course.isPublished ? new Date() : course.publishedAt,
    },
  });

  return updatedCourse;
};

// ============================================================================
// OPTION C: GESTION DES USERS (LISTE, FILTRES, ACTIONS)
// ============================================================================

/**
 * Lister tous les utilisateurs avec filtres et pagination
 */
const getAllUsers = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    accountType,
    isActive,
    isVerified,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const skip = (page - 1) * limit;
  const where = {};

  if (search) {
    where.OR = [
      { email: { contains: search } },
      { username: { contains: search } },
      { phone: { contains: search } },
      {
        profile: {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
          ],
        },
      },
    ];
  }

  if (accountType) where.accountType = accountType;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (isVerified !== undefined) where.isVerified = isVerified === 'true';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      include: {
        profile: true,
        subscription: {
          include: { plan: true },
        },
        stats: true,
        _count: {
          select: {
            subAccounts: true,
            languageProgress: true,
            courseProgress: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Obtenir un utilisateur par ID avec détails complets
 */
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      subscription: {
        include: { plan: true },
      },
      stats: true,
      languageProgress: {
        include: { language: true },
      },
      courseProgress: {
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          course: {
            select: { id: true, title: true, courseCode: true },
          },
        },
      },
      badges: {
        include: { badge: true },
      },
      certificates: {
        include: { certificate: true },
      },
      subAccounts: {
        include: { profile: true },
      },
      parentUser: {
        include: { profile: true },
      },
      loginAttempts: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Obtenir les statistiques d'un utilisateur
 */
const getUserStats = async (id) => {
  const [stats, recentActivity, progressByLanguage] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId: id } }),
    
    prisma.userDailyActivity.findMany({
      where: { userId: id },
      orderBy: { activityDate: 'desc' },
      take: 30,
    }),
    
    prisma.userLanguageProgress.findMany({
      where: { userId: id },
      include: { language: true },
    }),
  ]);

  return {
    stats,
    recentActivity,
    progressByLanguage,
  };
};

/**
 * Réinitialiser le mot de passe d'un utilisateur
 */
const resetUserPassword = async (id, newPassword) => {
  const bcrypt = require('bcryptjs');
  
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('User not found');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashedPassword },
  });

  return { message: 'Password reset successfully' };
};

/**
 * Activer/Désactiver un utilisateur
 */
const toggleUserActive = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
  });

  return updatedUser;
};

/**
 * Vérifier manuellement un utilisateur
 */
const verifyUser = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isVerified: true },
  });

  return updatedUser;
};

/**
 * Supprimer un utilisateur
 */
const deleteUser = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('User not found');
  }

  if (user.accountType === 'admin' || user.accountType === 'super_admin') {
    throw new Error('Cannot delete admin users');
  }

  await prisma.user.delete({ where: { id } });

  return { message: 'User deleted successfully' };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Dashboard
  getDashboardStats,
  
  // Courses
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  duplicateCourse,
  toggleCoursePublish,
  
  // Users
  getAllUsers,
  getUserById,
  getUserStats,
  resetUserPassword,
  toggleUserActive,
  verifyUser,
  deleteUser,
};