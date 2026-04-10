const { prisma } = require('../../config/prisma');

// ── SECTIONS ─────────────────────────────────────────────────────────────────

async function getLanguages() {
  const sections = await prisma.discoverSection.findMany({
    select: { language: true },
    distinct: ['language'],
    orderBy: { language: 'asc' },
  });
  return sections.map((s) => s.language);
}

async function getSectionsByLanguage(language) {
  const [lessons, exercises] = await Promise.all([
    prisma.discoverSection.findMany({
      where: { language, type: 'lesson' },
      orderBy: { order: 'asc' },
      include: {
        contents: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    }),
    prisma.discoverSection.findMany({
      where: { language, type: 'exercise' },
      orderBy: { order: 'asc' },
      include: {
        contents: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    }),
  ]);
  return { lessons, exercises };
}

async function getSectionsByLanguageAndType(language, type) {
  return prisma.discoverSection.findMany({
    where: { language, type },
    orderBy: { order: 'asc' },
    include: {
      contents: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  });
}

async function getSections() {
  return prisma.discoverSection.findMany({
    orderBy: { order: 'asc' },
    include: {
      contents: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  });
}

async function getSectionById(id) {
  return prisma.discoverSection.findUnique({
    where: { id },
    include: {
      contents: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  });
}

async function createSection(data) {
  const { title, type, language } = data;
  const count = await prisma.discoverSection.count();
  return prisma.discoverSection.create({
    data: { title, type, language, order: count + 1 },
  });
}

async function updateSection(id, data) {
  const { title, type, language } = data;
  return prisma.discoverSection.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(language !== undefined && { language }),
    },
  });
}

async function deleteSection(id) {
  return prisma.discoverSection.delete({ where: { id } });
}

// ── CONTENTS ─────────────────────────────────────────────────────────────────

async function createContent(sectionId, data) {
  const { order, questionType, questionValue, answerType, answerValue, options } = data;
  return prisma.discoverContent.create({
    data: {
      sectionId,
      order: order ?? 0,
      questionType,
      questionValue,
      answerType,
      answerValue,
      ...(options && options.length > 0 && {
        options: {
          create: options.map((opt, i) => ({
            value: opt.value,
            isCorrect: opt.isCorrect ?? false,
            order: opt.order ?? i,
          })),
        },
      }),
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });
}

async function updateContent(id, data) {
  const { order, questionType, questionValue, answerType, answerValue, options } = data;

  if (options !== undefined) {
    await prisma.discoverOption.deleteMany({ where: { contentId: id } });
  }

  return prisma.discoverContent.update({
    where: { id },
    data: {
      ...(order !== undefined && { order }),
      ...(questionType !== undefined && { questionType }),
      ...(questionValue !== undefined && { questionValue }),
      ...(answerType !== undefined && { answerType }),
      ...(answerValue !== undefined && { answerValue }),
      ...(options !== undefined && {
        options: {
          create: options.map((opt, i) => ({
            value: opt.value,
            isCorrect: opt.isCorrect ?? false,
            order: opt.order ?? i,
          })),
        },
      }),
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });
}

async function deleteContent(id) {
  return prisma.discoverContent.delete({ where: { id } });
}

module.exports = {
  getLanguages,
  getSections,
  getSectionsByLanguage,
  getSectionsByLanguageAndType,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
  createContent,
  updateContent,
  deleteContent,
};
