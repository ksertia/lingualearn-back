const { prisma } = require('../../config/prisma');

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

exports.getThemesByModuleId = async (moduleId) => {
  return prisma.theme.findMany({ where: { moduleId, isActive: true }, orderBy: { index: 'asc' } });
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
