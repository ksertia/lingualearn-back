// Récupérer tous les niveaux liés à un utilisateur (via userLevelProgress)
async function getLevelsByUserId(userId) {
	return prisma.userLevelProgress.findMany({
		where: { userId },
		include: { level: true }
	});
}

module.exports.getLevelsByUserId = getLevelsByUserId;
const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

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
	// S'assurer que le champ code est toujours présent
	const code = data.code ?? `LEVEL-${index}`;
	return prisma.level.create({ data: { ...data, index, code } });
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


// Progression utilisateur pour Level
async function selectLevelForUser(userId, levelId) {
	// Vérifie si déjà sélectionné
	let progress = await prisma.userLevelProgress.findUnique({ where: { userId_levelId: { userId, levelId } } });
	if (!progress) {
		 progress = await prisma.userLevelProgress.create({ data: { userId, levelId, status: 'locked' } });
	}
	return progress;
}

async function startLevelForUser(userId, levelId) {
	return prisma.userLevelProgress.update({
		 where: { userId_levelId: { userId, levelId } },
		 data: { status: 'started', startedAt: new Date() }
	});
}

async function completeLevelForUser(userId, levelId) {
	return prisma.userLevelProgress.update({
		 where: { userId_levelId: { userId, levelId } },
		 data: { status: 'completed', completedAt: new Date() }
	});
}

// Compléter un niveau avec déblocage automatique du suivant
async function completeLevelWithAutoUnlock(userId, levelId) {
	return await progressionService.completeLevelAndUnlockNext(userId, levelId);
}

module.exports = {
	createLevel,
	getAllLevels,
	getLevelById,
	updateLevel,
	deleteLevel,
	getLevelsByUserId,
	selectLevelForUser,
	startLevelForUser,
	completeLevelForUser,
	completeLevelWithAutoUnlock
};