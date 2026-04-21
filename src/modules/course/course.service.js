const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

// Récupérer tous les cours liés à un utilisateur (via userStepProgress -> step -> lesson)
exports.getCoursesByUserId = async (userId) => {
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

  // 2. Récupérer TOUTES les étapes de type 'lesson' du parcours avec leur progression
  const steps = await prisma.step.findMany({
    where: { 
      pathId: userPathProgress.pathId,
      stepType: 'lesson'
    },
    orderBy: { index: 'asc' },
    include: {
      lesson: true,
      userProgress: {
        where: { userId }  // Progression si elle existe
      }
    }
  });

  // 3. Formater la réponse avec le statut
  return steps.map(step => ({
    id: step.lesson?.id,
    title: step.lesson?.title,
    content: step.lesson?.content,
    videoUrl: step.lesson?.videoUrl,
    duration: step.lesson?.duration,
    
    // Info de l'étape
    stepId: step.id,
    stepTitle: step.title,
    stepIndex: step.index,
    estimatedMinutes: step.estimatedMinutes,
    
    // Progression (peut être null si jamais touché)
    progress: step.userProgress[0] || null,
    
    // Statut calculé
    status: step.userProgress[0]?.status || 'locked',
    progressValue: step.userProgress[0]?.progress || 0,
    score: step.userProgress[0]?.score || null,
    completedAt: step.userProgress[0]?.completedAt || null
  })).filter(course => course.id);  // Filtrer les steps sans lesson
};

const getLessonStepId = async (courseId) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: courseId } });
  if (!lesson) {
    throw new Error('Cours non trouvé');
  }
  return lesson.stepId;
};

exports.startCourseForUser = async (userId, courseId) => {
  const stepId = await getLessonStepId(courseId);
  return prisma.userStepProgress.update({
    where: { userId_stepId: { userId, stepId } },
    data: { status: 'started', startedAt: new Date() }
  });
};

exports.completeCourseForUser = async (userId, courseId) => {
  const stepId = await getLessonStepId(courseId);
  return exports.completeLessonForUser(courseId, userId);
};

// Récupérer les lessons d'une étape avec progression utilisateur
exports.getLessonsByStep = async (stepId, userId = null) => {
  // Récupérer la leçon de cette étape
  const lesson = await prisma.lesson.findUnique({
    where: { stepId },
    include: {
      step: {
        include: {
          userProgress: userId ? {
            where: { userId }
          } : false
        }
      }
    }
  });

  if (!lesson) {
    return null;
  }

  // Formater la réponse avec progression
  return {
    id: lesson.id,
    title: lesson.title,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    attachments: lesson.attachments,
    index: lesson.index,
    stepId: lesson.stepId,
    stepInfo: {
      id: lesson.step.id,
      title: lesson.step.title,
      description: lesson.step.description,
      estimatedMinutes: lesson.step.estimatedMinutes
    },
    userProgress: userId && lesson.step.userProgress?.[0] ? {
      status: lesson.step.userProgress[0].status,
      progress: lesson.step.userProgress[0].progress,
      score: lesson.step.userProgress[0].score,
      startedAt: lesson.step.userProgress[0].startedAt,
      completedAt: lesson.step.userProgress[0].completedAt
    } : null
  };
};

// Compléter une leçon pour un utilisateur
exports.completeLessonForUser = async (lessonId, userId) => {
  
  // 1. Récupérer la leçon
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      step: {
        include: {
          path: true
        }
      }
    }
  });

  if (!lesson) {
    throw new Error('Leçon non trouvée');
  }

  // 2. Vérifier si la progression existe
  const stepProgress = await prisma.userStepProgress.findUnique({
    where: {
      userId_stepId: {
        userId,
        stepId: lesson.stepId
      }
    }
  });

  if (!stepProgress) {
    throw new Error('Progression de l\'étape non trouvée. Veuillez d\'abord démarrer l\'étape.');
  }

  // 3. Mettre à jour la progression de l'étape
  const updatedProgress = await prisma.userStepProgress.update({
    where: {
      userId_stepId: {
        userId,
        stepId: lesson.stepId
      }
    },
    data: {
      status: 'completed',
      progress: 100,
      completedAt: new Date()
    }
  });

  // 4. Attribuer des récompenses (XP et coins pour avoir complété la leçon)
  const earnedXp = 10; // XP pour compléter une leçon
  const earnedCoins = 5; // Coins pour compléter une leçon

  await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalXp: earnedXp,
      totalCoins: earnedCoins,
      totalLessonsCompleted: 1
    },
    update: {
      totalXp: { increment: earnedXp },
      totalCoins: { increment: earnedCoins },
      totalLessonsCompleted: { increment: 1 }
    }
  });

  // 5. DÉBLOCAGE AUTOMATIQUE - Débloquer l'étape suivante
  let nextStepUnlocked = null;
  try {
    const nextStep = await prisma.step.findFirst({
      where: {
        pathId: lesson.step.pathId,
        index: { gt: lesson.step.index }
      },
      orderBy: { index: 'asc' }
    });

    if (nextStep) {
      // Créer ou mettre à jour la progression de l'étape suivante
      await prisma.userStepProgress.upsert({
        where: {
          userId_stepId: {
            userId,
            stepId: nextStep.id
          }
        },
        update: {
          status: 'unlocked',
          unlockedAt: new Date()
        },
        create: {
          userId,
          stepId: nextStep.id,
          status: 'unlocked',
          unlockedAt: new Date()
        }
      });
      
      nextStepUnlocked = {
        id: nextStep.id,
        title: nextStep.title,
        index: nextStep.index
      };
    } else {
      // Toutes les étapes complétées → cascade automatique (path → module → level → language)
      await progressionService.handlePathCompletion(userId, lesson.step.pathId);
    }
  } catch (error) {
    console.error('Erreur lors du déblocage de l\'étape suivante:', error);
  }

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    stepProgress: updatedProgress,
    rewards: {
      xp: earnedXp,
      coins: earnedCoins
    },
    nextStepUnlocked,
    message: nextStepUnlocked 
      ? `Leçon complétée ! Étape suivante débloquée : ${nextStepUnlocked.title}` 
      : 'Leçon complétée avec succès !'
  };
};

exports.createCourse = async (data) => {
  // Générer index automatiquement (dernier + 1 pour la step)
  const lastLesson = await prisma.lesson.findFirst({
    where: { stepId: data.stepId },
    orderBy: { index: 'desc' },
  });
  const lessonIndex = lastLesson ? lastLesson.index + 1 : 1;

  // Mapping des champs
  const mapped = {
    stepId: data.stepId,
    title: data.title,
    content: data.description || '',
    videoUrl: data.contentUrl,
    index: lessonIndex
  };
  return prisma.lesson.create({ data: mapped });
};

exports.getCourses = async (filters = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    stepId,
    isPublished,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters;

  const where = {};
  if (stepId) where.stepId = stepId;
  if (typeof isPublished === 'boolean') where.isFreePreview = isPublished;
  if (typeof isActive === 'boolean') where.isActive = isActive;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { contentText: { contains: search } }
    ];
  }

  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    prisma.lesson.count({ where }),
    prisma.lesson.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    })
  ]);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

exports.getCourse = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Cours non trouvé');
  return lesson;
};

exports.updateCourse = async (id, data) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Cours non trouvé');
  const { title, content, videoUrl, attachments, index } = data;
  const validData = {};
  if (title !== undefined) validData.title = title;
  if (content !== undefined) validData.content = content;
  if (videoUrl !== undefined) validData.videoUrl = videoUrl;
  if (attachments !== undefined) validData.attachments = attachments;
  if (index !== undefined) validData.index = index;
  return prisma.lesson.update({ where: { id }, data: validData });
};

exports.patchCourse = async (id, data) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Cours non trouvé');
  const { title, content, videoUrl, attachments, index } = data;
  const validData = {};
  if (title !== undefined) validData.title = title;
  if (content !== undefined) validData.content = content;
  if (videoUrl !== undefined) validData.videoUrl = videoUrl;
  if (attachments !== undefined) validData.attachments = attachments;
  if (index !== undefined) validData.index = index;
  return prisma.lesson.update({ where: { id }, data: validData });
};

exports.deleteCourse = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Cours non trouvé');
  return prisma.lesson.delete({ where: { id } });
};

exports.duplicateCourse = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Cours non trouvé');
  const { id: _, createdAt, updatedAt, ...copy } = lesson;
  copy.title = copy.title + ' (copie)';
  return prisma.lesson.create({ data: copy });
};

exports.toggleCoursePublish = async (id) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Cours non trouvé');
  return prisma.lesson.update({
    where: { id },
    data: { isFreePreview: !lesson.isFreePreview }
  });
};

exports.getCoursesByLevel = async (levelId) => {
  // Ici, levelId = stepId (relation directe)
  return prisma.lesson.findMany({ where: { stepId: levelId } });
};
