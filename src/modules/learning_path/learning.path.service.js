const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

// Récupérer tous les parcours liés à un utilisateur (via userPathProgress)
async function getPathsByUserId(userId) {
       return prisma.userPathProgress.findMany({
	       where: { userId },
	       include: { path: true }
       });
}

async function startPathForUser(userId, pathId) {
       return prisma.userPathProgress.update({
	       where: { userId_pathId: { userId, pathId } },
	       data: { status: 'started', startedAt: new Date() }
       });
}

async function completePathForUser(userId, pathId) {
       return prisma.userPathProgress.update({
	       where: { userId_pathId: { userId, pathId } },
	       data: { status: 'completed', completedAt: new Date() }
       });
}

// Compléter un parcours avec déblocage automatique du suivant
async function completePathWithAutoUnlock(userId, pathId) {
       return await progressionService.completePathAndUnlockNext(userId, pathId);
}

async function createPath(data) {
	// Calcul automatique de l'index si non fourni, null ou undefined
	let index = data.index;
	if (index === undefined || index === null || typeof index !== 'number' || isNaN(index)) {
		const max = await prisma.path.aggregate({ 
			_max: { index: true },
			where: data.moduleId ? { moduleId: data.moduleId } : {}
		});
		index = (max._max.index ?? -1) + 1; // Commence à 0 si aucun parcours n'existe
	}

	// Vérifier unicité de l'index dans le module si moduleId est fourni
	if (data.moduleId) {
		const existingIndex = await prisma.path.findFirst({ 
			where: { 
				moduleId: data.moduleId,
				index 
			} 
		});
		if (existingIndex) {
			throw new Error('Un parcours avec ce même index existe déjà dans ce module.');
		}
	}

	return prisma.path.create({ 
		data: { 
			...data, 
			index 
		} 
	});
}

async function getAllPaths() {
	return prisma.path.findMany();
}

async function getPathById(id) {
	return prisma.path.findUnique({ where: { id } });
}

async function updatePath(id, data) {
	// Si l'index est fourni, vérifier l'unicité
	if (data.index !== undefined && data.index !== null) {
		const path = await prisma.path.findUnique({ where: { id } });
		if (!path) {
			throw new Error('Parcours non trouvé.');
		}

		// Si le parcours a un moduleId, vérifier l'unicité dans ce module
		if (path.moduleId) {
			const existingIndex = await prisma.path.findFirst({ 
				where: { 
					moduleId: path.moduleId,
					index: data.index,
					id: { not: id }
				} 
			});
			if (existingIndex) {
				throw new Error('Un parcours avec ce même index existe déjà dans ce module.');
			}
		}
	}

	return prisma.path.update({ where: { id }, data });
}

async function deletePath(id) {
	return prisma.path.delete({ where: { id } });
}

module.exports = {
	createPath,
	getAllPaths,
	getPathById,
	updatePath,
	deletePath,
	getPathsByUserId,
	startPathForUser,
	completePathForUser,
	completePathWithAutoUnlock
};
