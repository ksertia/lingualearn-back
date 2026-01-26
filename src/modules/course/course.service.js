const { prisma } = require('../../config/prisma');

exports.createCourse = async (data) => {
  // Générer lessonNumber automatiquement (dernier + 1 pour la step)
  const lastLesson = await prisma.lesson.findFirst({
    where: { stepId: data.stepId },
    orderBy: { lessonNumber: 'desc' },
  });
  const lessonNumber = lastLesson ? lastLesson.lessonNumber + 1 : 1;

  // Mapping des champs
  const mapped = {
    stepId: data.stepId,
    title: data.title,
    lessonNumber,
    contentType: data.contentType,
    contentUrl: data.contentUrl,
    contentText: data.description,
    estimatedDurationMinutes: data.duration,
    isFreePreview: data.isPublished,
    sortOrder: data.order,
    isActive: data.isActive
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
