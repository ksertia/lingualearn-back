const { prisma } = require('../../config/prisma');
const { deriveState } = require('../progress/progress.service');

exports.createTheme = async (data) => {
  const module_ = await prisma.module.findUnique({ where: { id: data.moduleId } });
  if (!module_) throw new Error('Module non trouvé');

  let index = data.index;
  if (index === undefined) {
    const last = await prisma.theme.findFirst({ where: { moduleId: data.moduleId }, orderBy: { index: 'desc' } });
    index = last ? last.index + 1 : 0;
  }

  return prisma.theme.create({
    data: {
      moduleId:    data.moduleId,
      title:       data.title,
      description: data.description || null,
      iconUrl:     data.iconUrl || null,
      index,
      isActive: true
    }
  });
};

exports.getThemes = async (filters = {}) => {
  const { page = 1, limit = 20, search, moduleId, sortBy = 'index', sortOrder = 'asc' } = filters;
  const where = {};
  if (moduleId) where.moduleId = moduleId;
  if (search) where.title = { contains: search };

  const skip = (page - 1) * limit;
  const [total, data] = await Promise.all([
    prisma.theme.count({ where }),
    prisma.theme.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } })
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// userId optionnel : si fourni, enrichit chaque thème avec une progression calculée à la volée
// (moyenne des UserSubThemeProgress de ses sous-thèmes actifs) — pas de table UserThemeProgress dédiée,
// même logique que Module/Level mais sans persistance puisque le volume par thème reste faible.
exports.getThemesByModuleId = async (moduleId, userId = null) => {
  if (!userId) {
    return prisma.theme.findMany({ where: { moduleId, isActive: true }, orderBy: { index: 'asc' } });
  }

  const themes = await prisma.theme.findMany({
    where: { moduleId, isActive: true },
    orderBy: { index: 'asc' },
    include: {
      subThemes: {
        where: { isActive: true },
        select: { id: true, userProgress: { where: { userId }, select: { progressPercentage: true, startedAt: true, completedAt: true, lastAccessedAt: true } } }
      }
    }
  });

  return themes.map(theme => {
    const subProgresses = theme.subThemes.map(st => st.userProgress[0]).filter(Boolean);
    const progressPercentage = subProgresses.length > 0
      ? Math.round((subProgresses.reduce((acc, p) => acc + Number(p.progressPercentage), 0) / theme.subThemes.length) * 100) / 100
      : 0;
    const startedAt = subProgresses.map(p => p.startedAt).filter(Boolean).sort()[0] || null;
    const lastAccessedDates = subProgresses.map(p => p.lastAccessedAt).filter(Boolean).sort();
    const lastAccessedAt = lastAccessedDates.length > 0 ? lastAccessedDates[lastAccessedDates.length - 1] : null;
    const completedAt = theme.subThemes.length > 0 && subProgresses.length === theme.subThemes.length && subProgresses.every(p => p.completedAt)
      ? subProgresses.map(p => p.completedAt).sort()[subProgresses.length - 1]
      : null;

    return {
      id: theme.id,
      moduleId: theme.moduleId,
      title: theme.title,
      description: theme.description,
      iconUrl: theme.iconUrl,
      index: theme.index,
      isActive: theme.isActive,
      state: deriveState({ progressPercentage, startedAt, completedAt }),
      progressPercentage,
      startedAt,
      completedAt,
      lastAccessedAt
    };
  });
};

exports.getTheme = async (id) => {
  const theme = await prisma.theme.findUnique({
    where: { id },
    include: { subThemes: { orderBy: { index: 'asc' } } }
  });
  if (!theme) throw new Error('Thème non trouvé');
  return theme;
};

exports.updateTheme = async (id, data) => {
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) throw new Error('Thème non trouvé');

  const validData = {};
  ['title', 'description', 'iconUrl', 'index', 'isActive'].forEach(f => {
    if (data[f] !== undefined) validData[f] = data[f];
  });

  return prisma.theme.update({ where: { id }, data: validData });
};

exports.deleteTheme = async (id) => {
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) throw new Error('Thème non trouvé');
  return prisma.theme.delete({ where: { id } });
};
