const { prisma } = require('../../config/prisma');
const { cacheWrap, TTL } = require('../../utils/cache');

const getDiscoverableLanguages = async () => {
  return cacheWrap('discover:languages', async () => {
    return prisma.language.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, description: true, flagUrl: true },
      orderBy: { name: 'asc' },
    });
  }, TTL.LONG);
};

const getLanguagePreview = async (code) => {
  return cacheWrap(`discover:preview:${code}`, async () => {
    const language = await prisma.language.findFirst({
      where: { code, isActive: true },
      select: { id: true, code: true, name: true, description: true, flagUrl: true },
    });
    if (!language) return null;

    const levels = await prisma.level.findMany({
      where: { languageId: language.id, isActive: true },
      orderBy: { index: 'asc' },
      select: { id: true, name: true, code: true, description: true, index: true },
    });
    if (levels.length === 0) return { ...language, levels: [] };

    const levelIds = levels.map((l) => l.id);
    const themes = await prisma.theme.findMany({
      where: { levelId: { in: levelIds }, isActive: true },
      orderBy: { index: 'asc' },
      select: { id: true, levelId: true, title: true, description: true, index: true },
    });

    const themesMap = new Map();
    themes.forEach((t) => {
      if (!themesMap.has(t.levelId)) themesMap.set(t.levelId, []);
      themesMap.get(t.levelId).push(t);
    });

    return {
      ...language,
      levels: levels.map((level) => ({ ...level, themes: themesMap.get(level.id) || [] })),
    };
  }, TTL.LONG);
};

const getLanguageDemo = async (code) => {
  return cacheWrap(`discover:demo:${code}`, async () => {
    const language = await prisma.language.findFirst({
      where: { code, isActive: true },
      select: { id: true },
    });
    if (!language) return null;

    const subTheme = await prisma.subTheme.findFirst({
      where: {
        isDemo: true,
        isActive: true,
        theme: { level: { languageId: language.id } },
      },
      select: {
        id: true,
        title: true,
        description: true,
        theme: { select: { id: true, title: true } },
      },
    });
    if (!subTheme) return null;

    const contents = await prisma.content.findMany({
      where: { subThemeId: subTheme.id, isActive: true, contentType: { in: ['course', 'exercise'] } },
      orderBy: { index: 'asc' },
      select: {
        id: true,
        contentType: true,
        title: true,
        index: true,
        summary: true,
        statement: true,
        question: true,
        possibleAnswers: true,
        blocks: {
          orderBy: { index: 'asc' },
          select: { id: true, sectionType: true, blockType: true, content: true, caption: true, index: true },
        },
      },
    });

    return {
      subTheme: { id: subTheme.id, title: subTheme.title, description: subTheme.description, theme: subTheme.theme },
      contents,
    };
  }, TTL.MEDIUM);
};

const tryDemo = async (contentId, answer) => {
  const content = await prisma.content.findFirst({
    where: {
      id: contentId,
      contentType: 'exercise',
      isActive: true,
      subTheme: { isDemo: true, isActive: true },
    },
    select: { id: true, correctAnswer: true, explanation: true },
  });
  if (!content) {
    throw new Error('Exercice de démonstration non trouvé.');
  }

  const isCorrect = JSON.stringify(answer) === JSON.stringify(content.correctAnswer);

  return { isCorrect, explanation: content.explanation || null };
};

module.exports = { getDiscoverableLanguages, getLanguagePreview, getLanguageDemo, tryDemo };
