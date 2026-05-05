const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

// ── SECTIONS ─────────────────────────────────────────────────────────────────

const DISCOVER_INCLUDE = { contents: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } } };

async function getLanguages() {
  return cacheWrap('discover:languages', async () => {
    const sections = await prisma.discoverSection.findMany({ select: { language: true }, distinct: ['language'], orderBy: { language: 'asc' } });
    return sections.map((s) => s.language);
  }, TTL.LONG);
}

async function getSectionsByLanguage(language) {
  return cacheWrap(`discover:lang:${language}`, async () => {
    const [lessons, exercises] = await Promise.all([
      prisma.discoverSection.findMany({ where: { language, type: 'lesson' }, orderBy: { order: 'asc' }, include: DISCOVER_INCLUDE }),
      prisma.discoverSection.findMany({ where: { language, type: 'exercise' }, orderBy: { order: 'asc' }, include: DISCOVER_INCLUDE }),
    ]);
    return { lessons, exercises };
  }, TTL.LONG);
}

async function getSectionsByLanguageAndType(language, type) {
  return cacheWrap(`discover:lang:${language}:type:${type}`, () =>
    prisma.discoverSection.findMany({ where: { language, type }, orderBy: { order: 'asc' }, include: DISCOVER_INCLUDE }),
    TTL.LONG
  );
}

async function getSections() {
  return cacheWrap('discover:all', () =>
    prisma.discoverSection.findMany({ orderBy: { order: 'asc' }, include: DISCOVER_INCLUDE }),
    TTL.LONG
  );
}

async function getSectionById(id) {
  return cacheWrap(`discover:section:${id}`, () =>
    prisma.discoverSection.findUnique({ where: { id }, include: DISCOVER_INCLUDE }),
    TTL.LONG
  );
}

async function _invalidateDiscover(sectionId = null, language = null) {
  const keys = ['discover:all', 'discover:languages'];
  if (sectionId) keys.push(`discover:section:${sectionId}`);
  if (language) keys.push(`discover:lang:${language}`, `discover:lang:${language}:type:lesson`, `discover:lang:${language}:type:exercise`);
  await cacheDel(...keys);
}

async function createSection(data) {
  const { title, type, language } = data;
  const count = await prisma.discoverSection.count();
  const result = await prisma.discoverSection.create({ data: { title, type, language, order: count + 1 } });
  await _invalidateDiscover(null, language);
  return result;
}

async function updateSection(id, data) {
  const { title, type, language } = data;
  const result = await prisma.discoverSection.update({
    where: { id },
    data: { ...(title !== undefined && { title }), ...(type !== undefined && { type }), ...(language !== undefined && { language }) },
  });
  await _invalidateDiscover(id, result.language);
  return result;
}

async function deleteSection(id) {
  const section = await prisma.discoverSection.findUnique({ where: { id }, select: { language: true } });
  const result = await prisma.discoverSection.delete({ where: { id } });
  await _invalidateDiscover(id, section?.language);
  return result;
}

// ── CONTENTS ─────────────────────────────────────────────────────────────────

async function _invalidateDiscoverSection(sectionId) {
  const section = await prisma.discoverSection.findUnique({ where: { id: sectionId }, select: { language: true } });
  await _invalidateDiscover(sectionId, section?.language);
}

async function createContent(sectionId, data) {
  const { order, questionType, questionValue, answerType, answerValue, options } = data;
  const result = await prisma.discoverContent.create({
    data: {
      sectionId,
      order: order ?? 0,
      questionType,
      questionValue,
      answerType,
      answerValue,
      ...(options && options.length > 0 && {
        options: { create: options.map((opt, i) => ({ value: opt.value, isCorrect: opt.isCorrect ?? false, order: opt.order ?? i })) },
      }),
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });
  await _invalidateDiscoverSection(sectionId);
  return result;
}

async function updateContent(id, data) {
  const { order, questionType, questionValue, answerType, answerValue, options } = data;

  if (options !== undefined) {
    await prisma.discoverOption.deleteMany({ where: { contentId: id } });
  }

  const result = await prisma.discoverContent.update({
    where: { id },
    data: {
      ...(order !== undefined && { order }),
      ...(questionType !== undefined && { questionType }),
      ...(questionValue !== undefined && { questionValue }),
      ...(answerType !== undefined && { answerType }),
      ...(answerValue !== undefined && { answerValue }),
      ...(options !== undefined && {
        options: { create: options.map((opt, i) => ({ value: opt.value, isCorrect: opt.isCorrect ?? false, order: opt.order ?? i })) },
      }),
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });
  await _invalidateDiscoverSection(result.sectionId);
  return result;
}

async function deleteContent(id) {
  const content = await prisma.discoverContent.findUnique({ where: { id }, select: { sectionId: true } });
  const result = await prisma.discoverContent.delete({ where: { id } });
  if (content) await _invalidateDiscoverSection(content.sectionId);
  return result;
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
