const { prisma } = require('../../config/prisma');

async function createLevel(data) {
	// Indexation automatique par langue
	let index = data.index;
	if (typeof index !== 'number' || isNaN(index)) {
		const max = await prisma.level.aggregate({
			where: { languageId: data.languageId },
			_max: { index: true }
		});
		index = (max._max.index ?? 0) + 1;
	}
	// Vérifier unicité de l'index pour la langue
	const existing = await prisma.level.findFirst({ where: { languageId: data.languageId, index } });
	if (existing) {
		throw new Error('Un niveau avec ce même index existe déjà pour cette langue.');
	}
	return prisma.level.create({ data: { ...data, index } });
}

async function getAllLevels() {
	return prisma.level.findMany({
		orderBy: { index: 'asc' },
		include: {
			language: true
		}
	});
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