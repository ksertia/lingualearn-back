const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (data) => {
  return await prisma.module.create({ data });
};

exports.getAll = async () => {
  return await prisma.module.findMany({ orderBy: { index: 'asc' } });
};

exports.getById = async (id) => {
  return await prisma.module.findUnique({ where: { id } });
};

exports.update = async (id, data) => {
  return await prisma.module.update({ where: { id }, data });
};

exports.remove = async (id) => {
  const module = await prisma.module.findUnique({ where: { id } });
  if (!module) return null;
  await prisma.module.delete({ where: { id } });
  return true;
};
