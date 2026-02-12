const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

// Récupérer tous les parcours liés à un utilisateur (via userPathProgress)
async function getPathsByUserId(userId) {
	// 1. Trouver le module actuel de l'utilisateur
	const userModuleProgress = await prisma.userModuleProgress.findFirst({
		where: { 
			userId,
			status: { in: ['unlocked', 'started'] }  // Module actif
		},
		orderBy: { lastAccessedAt: 'desc' }
	});

	if (!userModuleProgress) {
		return [];  // Aucun module actif
	}

	// 2. Récupérer TOUS les parcours du module avec leur progression
	const paths = await prisma.path.findMany({
		where: { moduleId: userModuleProgress.moduleId },
		orderBy: { index: 'asc' },
		include: {
			userProgress: {
				where: { userId }  // Progression si elle existe
			}
		}
	});

	// 3. Formater la réponse avec le statut
	return paths.map(path => ({
		id: path.id,
		title: path.title,
		description: path.description,
		index: path.index,
		moduleId: path.moduleId,
		thumbnailUrl: path.thumbnailUrl,
		difficulty: path.difficulty,
		estimatedHours: path.estimatedHours,
		isActive: path.isActive,
		
		// Progression (peut être null si jamais touché)
		progress: path.userProgress[0] || null,
		
		// Statut calculé
		status: path.userProgress[0]?.status || 'locked',
		progressPercentage: path.userProgress[0]?.progressPercentage || 0,
		currentStepIndex: path.userProgress[0]?.currentStepIndex || 0,
		totalXp: path.userProgress[0]?.totalXp || 0,
		timeSpentMinutes: path.userProgress[0]?.timeSpentMinutes || 0,
		quizScore: path.userProgress[0]?.quizScore || null,
		unlockedAt: path.userProgress[0]?.unlockedAt || null,
		startedAt: path.userProgress[0]?.startedAt || null,
		completedAt: path.userProgress[0]?.completedAt || null,
		lastAccessedAt: path.userProgress[0]?.lastAccessedAt || null
	}));
}

async function startPathForUser(userId, pathId) {
	const progress = await prisma.userPathProgress.update({
		where: { userId_pathId: { userId, pathId } },
		data: { 
			status: 'started', 
			startedAt: new Date(),
			lastAccessedAt: new Date()
		}
	});
	
	// Débloquer automatiquement la première étape du parcours
	const firstStep = await prisma.step.findFirst({
		where: { pathId },
		orderBy: { index: 'asc' }
	});
	
	if (firstStep) {
		// Créer la progression pour la première étape avec status 'unlocked'
		await prisma.userStepProgress.upsert({
			where: { userId_stepId: { userId, stepId: firstStep.id } },
			update: { 
				status: 'unlocked',
				unlockedAt: new Date(),
				lastAccessedAt: new Date()
			},
			create: {
				userId,
				stepId: firstStep.id,
				status: 'unlocked',
				unlockedAt: new Date(),
				lastAccessedAt: new Date()
			}
		});
	}
	
	return progress;
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
