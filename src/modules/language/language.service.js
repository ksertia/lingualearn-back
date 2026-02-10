// Récupérer toutes les langues liées à un utilisateur (via userLanguageProgress)
exports.getLanguagesByUserId = async (userId) => {
       return await prisma.userLanguageProgress.findMany({
	       where: { userId },
	       include: { language: true }
       });
};

// Progression utilisateur pour Language
exports.selectLanguageForUser = async (userId, languageId) => {
       let progress = await prisma.userLanguageProgress.findUnique({ where: { userId_languageId: { userId, languageId } } });
       if (!progress) {
	       progress = await prisma.userLanguageProgress.create({ data: { userId, languageId, status: 'not_started' } });
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
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

exports.getAll = async () => {
	return await prisma.language.findMany({
		orderBy: { index: 'asc' },
		include: {
			levels: true
		}
	});
};

exports.getById = async (id) => {
	return await prisma.language.findUnique({ where: { id } });
};

exports.getLanguageLevels = async (languageId) => {
	// Vérifier si la langue existe
	const language = await prisma.language.findUnique({ where: { code: languageId } });
	if (!language) {
		return null;
	}

	// Récupérer tous les niveaux de la langue avec leurs modules
	const levels = await prisma.level.findMany({
		where: { languageId: language.id },
		orderBy: { index: 'asc' },
		include: {
			modules: {
				orderBy: { index: 'asc' },
				include: {
					paths: {
						orderBy: { index: 'asc' },
						include: {
							steps: {
								orderBy: { index: 'asc' }
							}
						}
					}
				}
			}
		}
	});

	return levels;
};

exports.getLevelModules = async (languageId, levelId) => {
	// Vérifier si la langue existe
	const language = await prisma.language.findUnique({ where: { code: languageId } });
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

	// Récupérer tous les modules du niveau avec leurs parcours et étapes
	const modules = await prisma.module.findMany({
		where: { levelId: level.id },
		orderBy: { index: 'asc' },
		include: {
			paths: {
				orderBy: { index: 'asc' },
				include: {
					steps: {
						orderBy: { index: 'asc' }
					}
				}
			}
		}
	});

	return {
		levelName: level.name,
		modules: modules
	};
};

exports.getModulePaths = async (languageId, levelId, moduleId) => {
	// Vérifier si la langue existe
	const language = await prisma.language.findUnique({ where: { code: languageId } });
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

	// Récupérer tous les parcours du module avec leurs étapes
	const paths = await prisma.path.findMany({
		where: { moduleId: module.id },
		orderBy: { index: 'asc' },
		include: {
			steps: {
				orderBy: { index: 'asc' }
			}
		}
	});

	return {
		moduleName: module.name,
		paths: paths
	};
};

exports.getPathSteps = async (languageId, levelId, moduleId, pathId) => {
	// Vérifier si la langue existe
	const language = await prisma.language.findUnique({ where: { code: languageId } });
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

exports.update = async (id, data) => {
	return await prisma.language.update({ where: { id }, data });
};

exports.remove = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) return null;
	await prisma.language.delete({ where: { id } });
	return true;
};
