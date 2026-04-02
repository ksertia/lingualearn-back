// Récupérer toutes les langues liées à un utilisateur (via userLanguageProgress)
exports.getLanguagesByUserId = async (userId) => {
	// Récupérer TOUTES les langues actives avec leur progression
	const languages = await prisma.language.findMany({
		where: { isActive: true },
		orderBy: { createdAt: 'asc' },
		include: {
			userProgress: {
				where: { userId }  // Progression si elle existe
			}
		}
	});

	// Formater la réponse avec le statut
	return languages.map(language => ({
		id: language.id,
		name: language.name,
		code: language.code,
		flagUrl: language.flagUrl,
		description: language.description,
		isActive: language.isActive,
		
		// Progression (peut être null si jamais touché)
		progress: language.userProgress[0] || null,
		
		// Statut calculé
		status: language.userProgress[0]?.status || 'not_started',
		overallProgress: language.userProgress[0]?.overallProgress || 0,
		totalXp: language.userProgress[0]?.totalXp || 0,
		totalTimeMinutes: language.userProgress[0]?.totalTimeMinutes || 0,
		startedAt: language.userProgress[0]?.startedAt || null,
		completedAt: language.userProgress[0]?.completedAt || null,
		lastAccessedAt: language.userProgress[0]?.lastAccessedAt || null
	}));
};

// Progression utilisateur pour Language
exports.selectLanguageForUser = async (userId, languageId) => {
	let progress = await prisma.userLanguageProgress.findUnique({ where: { userId_languageId: { userId, languageId } } });
	if (!progress) {
		// Créer et démarrer automatiquement la langue
		progress = await prisma.userLanguageProgress.create({ 
			data: { 
				userId, 
				languageId, 
				status: 'started',  // Démarré automatiquement
				startedAt: new Date(),
				lastAccessedAt: new Date()
			} 
		});
	} else {
		// Mettre à jour lastAccessedAt si déjà sélectionné
		progress = await prisma.userLanguageProgress.update({
			where: { userId_languageId: { userId, languageId } },
			data: { lastAccessedAt: new Date() }
		});
	}
	return progress;
};

exports.startLanguageForUser = async (userId, languageId) => {
       return prisma.userLanguageProgress.update({
	       where: { userId_languageId: { userId, languageId } },
	       data: { status: 'started', startedAt: new Date() }
       });
};

exports.completeLanguageForUser = async (userId, languageId) => {
       return prisma.userLanguageProgress.update({
	       where: { userId_languageId: { userId, languageId } },
	       data: { status: 'completed', completedAt: new Date() }
       });
};
const { prisma } = require('../../config/prisma');

exports.create = async (data) => {
	// Calcul automatique de l'index si non fourni
	let index = data.index;
	if (typeof index !== 'number' || isNaN(index)) {
		const max = await prisma.language.aggregate({ _max: { index: true } });
		index = (max._max.index ?? 0) + 1;
	}

	// Vérifier unicité de l'index
	const existingIndex = await prisma.language.findFirst({ where: { index } });
	if (existingIndex) {
		throw new Error('Une langue avec ce même index existe déjà.');
	}

	// Vérifier unicité du code
	if (data.code) {
		const existingCode = await prisma.language.findUnique({ where: { code: data.code } });
		if (existingCode) {
			throw new Error('Une langue avec ce code existe déjà.');
		}
	}

	return await prisma.language.create({ data: { ...data, index } });
};

exports.getAll = async (includeInactive = false) => {
	const where = includeInactive ? {} : { isActive: true };
	return await prisma.language.findMany({
		where,
		orderBy: { index: 'asc' },
		include: {
			levels: {
				where: { isActive: true },
				orderBy: { index: 'asc' }
			}
		}
	});
};

exports.getById = async (id) => {
	return await prisma.language.findUnique({ where: { id } });
};

exports.getLanguageLevels = async (languageId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Récupérer tous les niveaux de la langue (1 requête)
	const levels = await prisma.level.findMany({
		where: { languageId: language.id },
		orderBy: { index: 'asc' }
	});

	if (levels.length === 0) return [];

	// Récupérer tous les modules pour ces niveaux (1 requête)
	const levelIds = levels.map(l => l.id);
	const modules = await prisma.module.findMany({
		where: { levelId: { in: levelIds } },
		orderBy: { index: 'asc' }
	});

	// Récupérer tous les parcours pour ces modules (1 requête)
	const moduleIds = modules.map(m => m.id);
	const paths = moduleIds.length > 0 ? await prisma.path.findMany({
		where: { moduleId: { in: moduleIds } },
		orderBy: { index: 'asc' }
	}) : [];

	// Récupérer toutes les étapes pour ces parcours (1 requête)
	const pathIds = paths.map(p => p.id);
	const steps = pathIds.length > 0 ? await prisma.step.findMany({
		where: { pathId: { in: pathIds } },
		orderBy: { index: 'asc' }
	}) : [];

	// Construire la structure hiérarchique
	const stepsMap = new Map();
	steps.forEach(step => {
		if (!stepsMap.has(step.pathId)) stepsMap.set(step.pathId, []);
		stepsMap.get(step.pathId).push(step);
	});

	const pathsMap = new Map();
	paths.forEach(path => {
		if (!pathsMap.has(path.moduleId)) pathsMap.set(path.moduleId, []);
		pathsMap.get(path.moduleId).push({
			...path,
			steps: stepsMap.get(path.id) || []
		});
	});

	const modulesMap = new Map();
	modules.forEach(module => {
		if (!modulesMap.has(module.levelId)) modulesMap.set(module.levelId, []);
		modulesMap.get(module.levelId).push({
			...module,
			paths: pathsMap.get(module.id) || []
		});
	});

	// Assembler les niveaux avec leurs modules
	return levels.map(level => ({
		...level,
		modules: modulesMap.get(level.id) || []
	}));
};

exports.getLevelModules = async (languageId, levelId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Vérifier si le niveau existe pour cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: language.id 
		}
	});

	if (!level) {
		return null;
	}

	// Récupérer tous les modules du niveau (1 requête)
	const modules = await prisma.module.findMany({
		where: { levelId: level.id },
		orderBy: { index: 'asc' }
	});

	if (modules.length === 0) {
		return {
			levelName: level.name,
			modules: []
		};
	}

	// Récupérer tous les parcours pour ces modules (1 requête)
	const moduleIds = modules.map(m => m.id);
	const paths = await prisma.path.findMany({
		where: { moduleId: { in: moduleIds } },
		orderBy: { index: 'asc' }
	});

	// Récupérer toutes les étapes pour ces parcours (1 requête)
	const pathIds = paths.map(p => p.id);
	const steps = pathIds.length > 0 ? await prisma.step.findMany({
		where: { pathId: { in: pathIds } },
		orderBy: { index: 'asc' }
	}) : [];

	// Construire la structure hiérarchique
	const stepsMap = new Map();
	steps.forEach(step => {
		if (!stepsMap.has(step.pathId)) stepsMap.set(step.pathId, []);
		stepsMap.get(step.pathId).push(step);
	});

	const pathsMap = new Map();
	paths.forEach(path => {
		if (!pathsMap.has(path.moduleId)) pathsMap.set(path.moduleId, []);
		pathsMap.get(path.moduleId).push({
			...path,
			steps: stepsMap.get(path.id) || []
		});
	});

	// Assembler les modules avec leurs parcours
	const modulesWithPaths = modules.map(module => ({
		...module,
		paths: pathsMap.get(module.id) || []
	}));

	return {
		levelName: level.name,
		modules: modulesWithPaths
	};
};

exports.getModulePaths = async (languageId, levelId, moduleId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Vérifier si le niveau existe pour cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: language.id 
		}
	});

	if (!level) {
		return null;
	}

	// Vérifier si le module existe pour ce niveau
	const module = await prisma.module.findFirst({
		where: { 
			id: moduleId,
			levelId: level.id 
		}
	});

	if (!module) {
		return null;
	}

	// Récupérer tous les parcours du module (1 requête)
	const paths = await prisma.path.findMany({
		where: { moduleId: module.id },
		orderBy: { index: 'asc' }
	});

	if (paths.length === 0) {
		return {
			moduleName: module.name,
			paths: []
		};
	}

	// Récupérer toutes les étapes pour ces parcours (1 requête)
	const pathIds = paths.map(p => p.id);
	const steps = await prisma.step.findMany({
		where: { pathId: { in: pathIds } },
		orderBy: { index: 'asc' }
	});

	// Construire la structure hiérarchique
	const stepsMap = new Map();
	steps.forEach(step => {
		if (!stepsMap.has(step.pathId)) stepsMap.set(step.pathId, []);
		stepsMap.get(step.pathId).push(step);
	});

	// Assembler les parcours avec leurs étapes
	const pathsWithSteps = paths.map(path => ({
		...path,
		steps: stepsMap.get(path.id) || []
	}));

	return {
		moduleName: module.name,
		paths: pathsWithSteps
	};
};

exports.getPathSteps = async (languageId, levelId, moduleId, pathId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Vérifier si le niveau existe pour cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: language.id 
		}
	});

	if (!level) {
		return null;
	}

	// Vérifier si le module existe pour ce niveau
	const module = await prisma.module.findFirst({
		where: { 
			id: moduleId,
			levelId: level.id 
		}
	});

	if (!module) {
		return null;
	}

	// Vérifier si le parcours existe pour ce module
	const path = await prisma.path.findFirst({
		where: { 
			id: pathId,
			moduleId: module.id 
		}
	});

	if (!path) {
		return null;
	}

	// Récupérer toutes les étapes du parcours
	const steps = await prisma.step.findMany({
		where: { pathId: path.id },
		orderBy: { index: 'asc' }
	});

	return {
		pathName: path.name,
		steps: steps
	};
};

exports.getStepContent = async (languageId, levelId, moduleId, pathId, stepId) => {
	// Vérifier si la langue existe (par ID Prisma)
	const language = await prisma.language.findUnique({ where: { id: languageId } });
	if (!language) {
		return null;
	}

	// Vérifier si le niveau existe pour cette langue
	const level = await prisma.level.findFirst({
		where: { 
			id: levelId,
			languageId: language.id 
		}
	});

	if (!level) {
		return null;
	}

	// Vérifier si le module existe pour ce niveau
	const module = await prisma.module.findFirst({
		where: { 
			id: moduleId,
			levelId: level.id 
		}
	});

	if (!module) {
		return null;
	}

	// Vérifier si le parcours existe pour ce module
	const path = await prisma.path.findFirst({
		where: { 
			id: pathId,
			moduleId: module.id 
		}
	});

	if (!path) {
		return null;
	}

	// Vérifier si l'étape existe pour ce parcours
	const step = await prisma.step.findFirst({
		where: { 
			id: stepId,
			pathId: path.id 
		}
	});

	if (!step) {
		return null;
	}

	// Récupérer tous les cours liés à cette étape
	const courses = await prisma.course.findMany({
		where: { stepId: step.id },
		orderBy: { order: 'asc' }
	});

	// Récupérer tous les exercices liés à cette étape
	const exercises = await prisma.exercise.findMany({
		where: { stepId: step.id },
		orderBy: { order: 'asc' }
	});

	// Récupérer tous les quiz liés à cette étape
	const quizzes = await prisma.stepQuiz.findMany({
		where: { stepId: step.id },
		orderBy: { order: 'asc' },
		include: {
			questions: {
				orderBy: { order: 'asc' }
			}
		}
	});

	return {
		stepName: step.name,
		step: step,
		courses: courses,
		exercises: exercises,
		quizzes: quizzes
	};
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

// Activer une langue
exports.activateLanguage = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) {
		throw new Error('Langue introuvable');
	}
	return await prisma.language.update({
		where: { id },
		data: { isActive: true }
	});
};

// Désactiver une langue
exports.deactivateLanguage = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) {
		throw new Error('Langue introuvable');
	}
	return await prisma.language.update({
		where: { id },
		data: { isActive: false }
	});
};

// Récupérer toutes les langues actives
exports.getActiveLanguages = async () => {
	return await prisma.language.findMany({
		where: { isActive: true },
		orderBy: { index: 'asc' },
		include: {
			levels: {
				where: { isActive: true },
				orderBy: { index: 'asc' }
			}
		}
	});
};

// Récupérer les niveaux disponibles pour une langue
exports.getAvailableLevels = async (languageId) => {
	const language = await prisma.language.findUnique({ 
		where: { id: languageId },
		include: {
			levels: {
				where: { isActive: true },
				orderBy: { index: 'asc' },
				select: {
					id: true,
					code: true,
					name: true,
					description: true,
					index: true,
					isActive: true,
					_count: {
						select: {
							modules: true
						}
					}
				}
			}
		}
	});
	
	if (!language) {
		throw new Error('Langue introuvable');
	}
	
	return {
		language: {
			id: language.id,
			code: language.code,
			name: language.name,
			isActive: language.isActive
		},
		levels: language.levels
	};
};