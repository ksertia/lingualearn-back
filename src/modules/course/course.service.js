const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheDel } = require('../../utils/cache');
const { notifyLearnersNewContent } = require('../../utils/contentNotifier');

exports.getCoursesByUserId = async (userId) => {
  const userPathProgress = await prisma.userPathProgress.findFirst({
    where: { userId, status: { in: ['unlocked', 'started'] } },
    orderBy: { lastAccessedAt: 'desc' },
    select: { pathId: true }
  });
  if (!userPathProgress) return [];

  // Fetch lesson-steps + user progress in parallel (no N+1)
  const [steps, userProgressList] = await Promise.all([
    prisma.step.findMany({
      where: { pathId: userPathProgress.pathId, stepType: 'lesson' },
      orderBy: { index: 'asc' },
      select: {
        id: true, title: true, index: true, estimatedMinutes: true,
        lesson: { select: { id: true, title: true, content: true, videoUrl: true, duration: true } }
      }
    }),
    prisma.userStepProgress.findMany({
      where: { userId, step: { pathId: userPathProgress.pathId, stepType: 'lesson' } },
      select: { stepId: true, status: true, progressPercentage: true, score: true, completedAt: true }
    })
  ]);

  const progressMap = new Map(userProgressList.map(p => [p.stepId, p]));

  return steps
    .filter(step => step.lesson)
    .map(step => {
      const prog = progressMap.get(step.id) || null;
      return {
        id: step.lesson.id, title: step.lesson.title, content: step.lesson.content,
        videoUrl: step.lesson.videoUrl, duration: step.lesson.duration,
        stepId: step.id, stepTitle: step.title, stepIndex: step.index,
        estimatedMinutes: step.estimatedMinutes,
        progress: prog,
        status: prog?.status || 'locked',
        progressValue: prog?.progressPercentage || 0,
        score: prog?.score || null,
        completedAt: prog?.completedAt || null
      };
    });
};

const _getLessonWithStep = async (lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { step: { select: { id: true, pathId: true, index: true } } }
  });
  if (!lesson) throw new Error('Cours non trouvé');
  return lesson;
};

exports.startCourseForUser = async (userId, courseId) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: courseId }, select: { stepId: true } });
  if (!lesson) throw new Error('Cours non trouvé');
  return prisma.userStepProgress.update({
    where: { userId_stepId: { userId, stepId: lesson.stepId } },
    data: { status: 'started', startedAt: new Date() }
  });
};

exports.completeCourseForUser = async (userId, courseId) => {
  return exports.completeLessonForUser(courseId, userId);
};

exports.getLessonsByStep = async (stepId, userId = null) => {
  const [lesson, userProgress] = await Promise.all([
    prisma.lesson.findUnique({
      where: { stepId },
      include: { step: { select: { id: true, title: true, description: true, estimatedMinutes: true } } }
    }),
    userId
      ? prisma.userStepProgress.findUnique({
          where: { userId_stepId: { userId, stepId } },
          select: { status: true, progressPercentage: true, score: true, startedAt: true, completedAt: true }
        })
      : Promise.resolve(null)
  ]);

  if (!lesson) return null;

  return {
    id: lesson.id, title: lesson.title, content: lesson.content,
    videoUrl: lesson.videoUrl, attachments: lesson.attachments, index: lesson.index,
    stepId: lesson.stepId,
    stepInfo: { id: lesson.step.id, title: lesson.step.title, description: lesson.step.description, estimatedMinutes: lesson.step.estimatedMinutes },
    userProgress: userProgress || null
  };
};

exports.completeLessonForUser = async (lessonId, userId) => {
  const lesson = await _getLessonWithStep(lessonId);

  const earnedXp = 10;
  const earnedCoins = 5;

  // Marquer l'étape complétée + stats en parallèle
  const [updatedProgress] = await Promise.all([
    prisma.userStepProgress.upsert({
      where: { userId_stepId: { userId, stepId: lesson.stepId } },
      update: { status: 'completed', progressPercentage: 100, completedAt: new Date() },
      create: { userId, stepId: lesson.stepId, status: 'completed', progressPercentage: 100, completedAt: new Date() }
    }),
    prisma.userStats.upsert({
      where: { userId },
      create: { userId, totalXp: earnedXp, totalCoins: earnedCoins, totalLessonsCompleted: 1 },
      update: { totalXp: { increment: earnedXp }, totalCoins: { increment: earnedCoins }, totalLessonsCompleted: { increment: 1 } }
    })
  ]);

  // Cascade complète : recalcul + déblocage suivant + notifications
  let nextStepUnlocked = null;
  try {
    await progressionService.completeStepAndUnlockNext(userId, lesson.stepId);
    const nextStep = await prisma.step.findFirst({
      where: { pathId: lesson.step.pathId, index: { gt: lesson.step.index }, isActive: true },
      orderBy: { index: 'asc' }, select: { id: true, title: true, index: true }
    });
    if (nextStep) nextStepUnlocked = { id: nextStep.id, title: nextStep.title, index: nextStep.index };
  } catch (_) {}

  cacheDel(`user:${userId}:state`, `gamification:user:${userId}:stats`).catch(() => {});

  return {
    lessonId: lesson.id, lessonTitle: lesson.title, stepProgress: updatedProgress,
    rewards: { xp: earnedXp, coins: earnedCoins },
    nextStepUnlocked,
    message: nextStepUnlocked
      ? `Leçon complétée ! Étape suivante débloquée : ${nextStepUnlocked.title}`
      : 'Leçon complétée avec succès !'
  };
};

exports.createCourse = async (data) => {
  const lastLesson = await prisma.lesson.findFirst({ where: { stepId: data.stepId }, orderBy: { index: 'desc' } });
  const lessonIndex = lastLesson ? lastLesson.index + 1 : 1;

  const isText = !data.contentType || data.contentType === 'text';
  const created = await prisma.lesson.create({
    data: {
      stepId: data.stepId,
      title: data.title,
      content: isText ? (data.description || '') : '',
      videoUrl: isText ? null : (data.contentUrl || null),
      index: lessonIndex
    }
  });
  notifyLearnersNewContent('course', { id: created.id, title: created.title }).catch(() => {});
  return created;
};

exports.getCourses = async (filters = {}) => {
  const { page = 1, limit = 20, search, stepId, isPublished, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
  const where = {};
  if (stepId) where.stepId = stepId;
  if (typeof isPublished === 'boolean') where.isFreePreview = isPublished;
  if (typeof isActive === 'boolean') where.isActive = isActive;
  if (search) where.OR = [{ title: { contains: search } }, { contentText: { contains: search } }];

  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    prisma.lesson.count({ where }),
    prisma.lesson.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } })
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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

exports.patchCourse = exports.updateCourse;

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
  return prisma.lesson.update({ where: { id }, data: { isFreePreview: !lesson.isFreePreview } });
};

exports.getCoursesByLevel = async (levelId) => {
  return prisma.lesson.findMany({ where: { stepId: levelId } });
};
