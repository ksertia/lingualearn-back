const { prisma } = require('../../config/prisma');

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
  return prisma.userStepProgress.update({
    where: { userId_stepId: { userId, stepId } },
    data: { status: 'completed', completedAt: new Date() }
  });
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
      { title: { contains: search, mode: 'insensitive' } },
      { contentText: { contains: search, mode: 'insensitive' } }
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
  return prisma.lesson.update({ where: { id }, data });
};

exports.patchCourse = async (id, data) => {
  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) throw new Error('Cours non trouvé');
  return prisma.lesson.update({ where: { id }, data });
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
