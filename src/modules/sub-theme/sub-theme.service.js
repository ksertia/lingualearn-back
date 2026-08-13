const { prisma } = require('../../config/prisma');

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

exports.getSubThemesByThemeId = async (themeId) => {
  return prisma.subTheme.findMany({ where: { themeId, isActive: true }, orderBy: { index: 'asc' } });
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

exports.updateSubTheme = async (id, data) => {
  const subTheme = await prisma.subTheme.findUnique({ where: { id } });
  if (!subTheme) throw new Error('Sous-thème non trouvé');

  const validData = {};
  ['title', 'description', 'index', 'isActive'].forEach(f => {
    if (data[f] !== undefined) validData[f] = data[f];
  });

  return prisma.subTheme.update({ where: { id }, data: validData });
};

exports.deleteSubTheme = async (id) => {
  const subTheme = await prisma.subTheme.findUnique({ where: { id } });
  if (!subTheme) throw new Error('Sous-thème non trouvé');
  return prisma.subTheme.delete({ where: { id } });
};
