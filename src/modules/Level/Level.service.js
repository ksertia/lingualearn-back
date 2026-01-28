const { prisma } = require('../../config/prisma');

async function createLevel(data) {
	return prisma.level.create({ data });
}

async function getAllLevels() {
	return prisma.level.findMany();
}

async function getLevelById(id) {
	return prisma.level.findUnique({ where: { id } });
}

async function updateLevel(id, data) {
	return prisma.level.update({ where: { id }, data });
}

async function deleteLevel(id) {
	return prisma.level.delete({ where: { id } });
}

module.exports = {
	createLevel,
	getAllLevels,
	getLevelById,
	updateLevel,
	deleteLevel
};