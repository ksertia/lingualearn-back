const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (data) => {
	return await prisma.language.create({ data });
};

exports.getAll = async () => {
	return await prisma.language.findMany({ orderBy: { index: 'asc' } });
};

exports.getById = async (id) => {
	return await prisma.language.findUnique({ where: { id } });
};

exports.update = async (id, data) => {
	return await prisma.language.update({ where: { id }, data });
};

exports.remove = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) return null;
	await prisma.language.delete({ where: { id } });
	return true;
};

