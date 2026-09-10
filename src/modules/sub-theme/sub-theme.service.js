const { prisma } = require('../../config/prisma');
const { deriveState, recalculateThemeProgress, recalculateModuleAndLevelProgress } = require('../progress/progress.service');
const { cacheInvalidatePattern } = require('../../utils/cache');

const CONTENT_SELECT = {
  id: true, contentType: true, title: true, index: true, isActive: true,
  summary: true, videoUrl: true, description: true, keyPoints: true,
  statement: true, question: true, possibleAnswers: true, correctAnswer: true, explanation: true,
  resourceType: true, resourceUrl: true,
  blocks: { orderBy: { index: 'asc' } }
};

exports.createSubTheme = async (data) => {
  const theme = await prisma.theme.findUnique({ where: { id: data.themeId } });
  if (!theme) throw new Error('Thème non trouvé');

  let index = data.index;
  if (index === undefined) {
    const last = await prisma.subTheme.findFirst({ where: { themeId: data.themeId }, orderBy: { index: 'desc' } });
    index = last ? last.index + 1 : 0;
  }

  return prisma.subTheme.create({
    data: {
      themeId:     data.themeId,
      title:       data.title,
      description: data.description || null,
      index,
      isActive: true
    }
  });
};

exports.getSubThemes = async (filters = {}) => {
  const { page = 1, limit = 20, search, themeId, sortBy = 'index', sortOrder = 'asc' } = filters;
  const where = {};
  if (themeId) where.themeId = themeId;
  if (search) where.title = { contains: search };

  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    prisma.subTheme.count({ where }),
    prisma.subTheme.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } })
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// userId optionnel : si fourni, enrichit chaque sous-thème avec sa progression (state, progressPercentage) pour cet utilisateur.
exports.getSubThemesByThemeId = async (themeId, userId = null) => {
  if (!userId) {
    return prisma.subTheme.findMany({ where: { themeId, isActive: true }, orderBy: { index: 'asc' } });
  }

  const subThemes = await prisma.subTheme.findMany({
    where: { themeId, isActive: true },
    orderBy: { index: 'asc' },
    include: { userProgress: { where: { userId }, select: { progressPercentage: true, startedAt: true, completedAt: true, lastAccessedAt: true } } }
  });

  return subThemes.map(st => ({
    id: st.id,
    themeId: st.themeId,
    title: st.title,
    description: st.description,
    index: st.index,
    isActive: st.isActive,
    progress: st.userProgress[0] || null,
    state: deriveState(st.userProgress[0] || {}),
    progressPercentage: st.userProgress[0]?.progressPercentage || 0,
    startedAt: st.userProgress[0]?.startedAt || null,
    completedAt: st.userProgress[0]?.completedAt || null,
    lastAccessedAt: st.userProgress[0]?.lastAccessedAt || null
  }));
};

exports.getSubTheme = async (id) => {
  const subTheme = await prisma.subTheme.findUnique({
    where: { id },
    include: {
      contents: { orderBy: { index: 'asc' }, select: CONTENT_SELECT },
      evaluation: true
    }
  });
  if (!subTheme) throw new Error('Sous-thème non trouvé');
  return subTheme;
};

// Démarre un sous-thème pour un utilisateur — pose startedAt/lastAccessedAt sans toucher au %.
// Idempotent : un second appel ne réinitialise pas startedAt. Propage startedAt/lastAccessedAt
// au thème parent pour cohérence d'affichage.
exports.startSubThemeForUser = async (userId, subThemeId) => {
  const subTheme = await prisma.subTheme.findUnique({ where: { id: subThemeId }, select: { themeId: true } });
  if (!subTheme) throw new Error('Sous-thème non trouvé');

  const now = new Date();
  const existing = await prisma.userSubThemeProgress.findUnique({ where: { userId_subThemeId: { userId, subThemeId } } });
  const progress = await prisma.userSubThemeProgress.upsert({
    where: { userId_subThemeId: { userId, subThemeId } },
    update: { startedAt: existing?.startedAt || now, lastAccessedAt: now },
    create: { userId, subThemeId, startedAt: now, lastAccessedAt: now }
  });

  await recalculateThemeProgress(userId, subTheme.themeId);

  return { ...progress, state: deriveState(progress) };
};

// Marque un sous-thème comme complété pour un utilisateur — force progressPercentage à 100
// et completedAt, puis propage le recalcul au thème, au module et au niveau.
exports.completeSubThemeForUser = async (userId, subThemeId) => {
  const subTheme = await prisma.subTheme.findUnique({
    where: { id: subThemeId },
    select: { themeId: true, theme: { select: { moduleId: true } } }
  });
  if (!subTheme) throw new Error('Sous-thème non trouvé');

  const now = new Date();
  const existing = await prisma.userSubThemeProgress.findUnique({ where: { userId_subThemeId: { userId, subThemeId } } });
  const progress = await prisma.userSubThemeProgress.upsert({
    where: { userId_subThemeId: { userId, subThemeId } },
    update: { progressPercentage: 100, completedAt: now, lastAccessedAt: now, startedAt: existing?.startedAt || now },
    create: { userId, subThemeId, progressPercentage: 100, completedAt: now, startedAt: now, lastAccessedAt: now }
  });

  await recalculateThemeProgress(userId, subTheme.themeId);
  if (subTheme.theme?.moduleId) await recalculateModuleAndLevelProgress(userId, subTheme.theme.moduleId);

  return { ...progress, state: deriveState(progress) };
};

exports.updateSubTheme = async (id, data) => {
  const subTheme = await prisma.subTheme.findUnique({
    where: { id },
    include: { theme: { select: { module: { select: { level: { select: { language: { select: { id: true, code: true } } } } } } } } }
  });
  if (!subTheme) throw new Error('Sous-thème non trouvé');

  const validData = {};
  ['title', 'description', 'index', 'isActive', 'isDemo'].forEach(f => {
    if (data[f] !== undefined) validData[f] = data[f];
  });

  const language = subTheme.theme.module.level.language;

  // Un seul sous-thème démo par langue — évite l'ambiguïté sur GET /discover/languages/:code/demo
  if (validData.isDemo === true) {
    await prisma.subTheme.updateMany({
      where: {
        isDemo: true,
        id: { not: id },
        theme: { module: { level: { languageId: language.id } } }
      },
      data: { isDemo: false }
    });
  }

  const updated = await prisma.subTheme.update({ where: { id }, data: validData });

  if (validData.isDemo !== undefined) {
    await cacheInvalidatePattern(`discover:demo:${language.code}`);
  }

  return updated;
};

exports.deleteSubTheme = async (id) => {
  const subTheme = await prisma.subTheme.findUnique({ where: { id } });
  if (!subTheme) throw new Error('Sous-thème non trouvé');
  return prisma.subTheme.delete({ where: { id } });
};
