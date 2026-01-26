const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (data) => {
  // Prisma requires sortOrder (non-nullable, no default in schema)
  if (typeof data.sortOrder === 'undefined' || data.sortOrder === null) {
    data.sortOrder = data.stepNumber || 1;
  }
  return prisma.step.create({ data });
};

exports.getAll = async () => {
  return prisma.step.findMany();
};

exports.getById = async (id) => {
  return prisma.step.findUnique({ where: { id } });
};

exports.update = async (id, data) => {
  return prisma.step.update({ where: { id }, data });
};

exports.remove = async (id) => {
  try {
    await prisma.step.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
};
