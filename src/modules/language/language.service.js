const progressionService = require('../progression/progression.service');
const { cacheWrap, cacheDel, cacheInvalidatePattern, TTL } = require('../../utils/cache');

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

// Assignation d'une langue à un enfant par son parent
exports.assignLanguageToChild = async (parentId, childId, languageId) => {
    const { AppError } = require('../../middleware/errorHandler');

    // Vérifier que l'enfant appartient bien à ce parent
    const child = await prisma.user.findFirst({
        where: { id: childId, parentId, accountType: 'sub_account_learner' }
    });
    if (!child) {
        throw new AppError(404, 'Child account not found or does not belong to you');
    }

    // Vérifier que la langue existe et est active
    const language = await prisma.language.findFirst({
        where: { id: languageId, isActive: true },
        select: { id: true, name: true, code: true, flagUrl: true }
    });
    if (!language) {
        throw new AppError(404, 'Language not found or not active');
    }

    // Vérifier si déjà assigné
    const existing = await prisma.userLanguageProgress.findUnique({
        where: { userId_languageId: { userId: childId, languageId } }
    });

    if (existing) {
        return {
            success: true,
            message: `Language "${language.name}" already assigned to ${child.username}`,
            data: { language, progress: existing }
        };
    }

    // Initialiser la progression complète (langue → level1 → module1 → parcours1 → étape1)
    await progressionService.initializeUserLanguageProgress(childId, languageId);

    const progress = await prisma.userLanguageProgress.findUnique({
        where: { userId_languageId: { userId: childId, languageId } }
    });

    return {
        success: true,
        message: `Language "${language.name}" assigned to ${child.username} — progression initialisée`,
        data: { language, progress }
    };
};

// Désassigner une langue d'un enfant (supprime toute la progression liée)
exports.unassignLanguageFromChild = async (parentId, childId, languageId) => {
    const { AppError } = require('../../middleware/errorHandler');

    const child = await prisma.user.findFirst({
        where: { id: childId, parentId, accountType: 'sub_account_learner' }
    });
    if (!child) throw new AppError(404, 'Child account not found or does not belong to you');

    const existing = await prisma.userLanguageProgress.findUnique({
        where: { userId_languageId: { userId: childId, languageId } }
    });
    if (!existing) throw new AppError(404, 'This language is not assigned to this child');

    // Supprimer en cascade : étape → parcours → module → niveau → langue
    await prisma.userStepProgress.deleteMany({ where: { userId: childId, step: { path: { module: { level: { languageId } } } } } });
    await prisma.userPathProgress.deleteMany({ where: { userId: childId, path: { module: { level: { languageId } } } } });
    await prisma.userModuleProgress.deleteMany({ where: { userId: childId, module: { level: { languageId } } } });
    await prisma.userLevelProgress.deleteMany({ where: { userId: childId, level: { languageId } } });
    await prisma.userLanguageProgress.delete({ where: { userId_languageId: { userId: childId, languageId } } });

    return { success: true, message: 'Language unassigned and all related progress deleted' };
};

// Récupérer les langues assignées à un enfant (vue parent)
exports.getChildLanguages = async (parentId, childId) => {
    const { AppError } = require('../../middleware/errorHandler');

    const child = await prisma.user.findFirst({
        where: { id: childId, parentId, accountType: 'sub_account_learner' }
    });
    if (!child) {
        throw new AppError(404, 'Child account not found or does not belong to you');
    }

    const languages = await prisma.language.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
            userProgress: { where: { userId: childId } }
        }
    });

    return {
        success: true,
        child: { id: child.id, username: child.username },
        data: languages.map(lang => ({
            id: lang.id,
            name: lang.name,
            code: lang.code,
            flagUrl: lang.flagUrl,
            status: lang.userProgress[0]?.status || 'not_started',
            overallProgress: lang.userProgress[0]?.overallProgress || 0,
            totalXp: lang.userProgress[0]?.totalXp || 0,
            assignedAt: lang.userProgress[0]?.startedAt || null,
        }))
    };
};

// Calcul de la progression par langue (niveau/module/parcours/étape en cours + taux)
// Utilisé par le parent (pour son enfant) ET par l'enfant lui-même
async function computeCurrentProgress(userId) {
    return cacheWrap(`user:${userId}:progress`, async () => _computeCurrentProgress(userId), TTL.SHORT);
}

async function _computeCurrentProgress(userId) {
    const pct = (val) => Math.round(Number(val ?? 0));

    // 1 query — all assigned languages
    const allLangs = await prisma.userLanguageProgress.findMany({
        where: { userId },
        orderBy: { lastAccessedAt: 'desc' },
        include: { language: { select: { id: true, name: true, code: true, flagUrl: true } } }
    });
    if (!allLangs.length) return null;

    const languageIds = allLangs.map(l => l.languageId);

    // Batch load active level/module/path/step progress for all languages at once
    const [allLevelProgs, allModuleProgs, allPathProgs, allStepProgs] = await Promise.all([
        prisma.userLevelProgress.findMany({
            where: { userId, status: { in: ['started', 'unlocked'] }, level: { languageId: { in: languageIds } } },
            orderBy: { lastAccessedAt: 'desc' },
            include: { level: { select: { id: true, name: true, code: true, languageId: true } } }
        }),
        prisma.userModuleProgress.findMany({
            where: { userId, status: { in: ['started', 'unlocked'] } },
            orderBy: { lastAccessedAt: 'desc' },
            include: { module: { select: { id: true, title: true, levelId: true } } }
        }),
        prisma.userPathProgress.findMany({
            where: { userId, status: { in: ['started', 'unlocked'] } },
            orderBy: { lastAccessedAt: 'desc' },
            include: { path: { select: { id: true, title: true, moduleId: true } } }
        }),
        prisma.userStepProgress.findMany({
            where: { userId, status: { notIn: ['completed'] } },
            orderBy: { updatedAt: 'desc' },
            include: { step: { select: { id: true, title: true, stepType: true, pathId: true } } }
        }),
    ]);

    // Build maps for O(1) lookup per language/level/module/path
    const levelByLang   = new Map(); // languageId → first active level
    const moduleByLevel = new Map(); // levelId    → first active module
    const pathByModule  = new Map(); // moduleId   → first active path
    const stepByPath    = new Map(); // pathId     → first active step

    for (const lp of allLevelProgs)  if (!levelByLang.has(lp.level.languageId))   levelByLang.set(lp.level.languageId, lp);
    for (const mp of allModuleProgs) if (!moduleByLevel.has(mp.module.levelId))   moduleByLevel.set(mp.module.levelId, mp);
    for (const pp of allPathProgs)   if (!pathByModule.has(pp.path.moduleId))     pathByModule.set(pp.path.moduleId, pp);
    for (const sp of allStepProgs)   if (!stepByPath.has(sp.step.pathId))         stepByPath.set(sp.step.pathId, sp);

    // Collect all IDs we need counts for, then batch-fetch counts
    const levelIds  = [...new Set(allLevelProgs.map(l => l.levelId))];
    const moduleIds = [...new Set(allModuleProgs.map(m => m.moduleId))];
    const pathIds   = [...new Set(allPathProgs.map(p => p.pathId))];

    const [modCountByLevel, completedModByLevel, pathCountByModule, completedPathByModule, stepCountByPath, completedStepByPath] = await Promise.all([
        // total modules per level
        prisma.module.groupBy({ by: ['levelId'], where: { levelId: { in: levelIds } }, _count: { id: true } }),
        // completed modules per level for this user
        prisma.userModuleProgress.groupBy({ by: ['moduleId'], where: { userId, status: 'completed', module: { levelId: { in: levelIds } } }, _count: { id: true },
            // we need levelId too — join via module
        }).then(async rows => {
            const mods = await prisma.module.findMany({ where: { id: { in: rows.map(r => r.moduleId) } }, select: { id: true, levelId: true } });
            const levelMap = new Map(mods.map(m => [m.id, m.levelId]));
            const acc = new Map();
            for (const r of rows) {
                const lid = levelMap.get(r.moduleId);
                if (lid) acc.set(lid, (acc.get(lid) ?? 0) + r._count.id);
            }
            return acc;
        }),
        // total paths per module
        prisma.path.groupBy({ by: ['moduleId'], where: { moduleId: { in: moduleIds } }, _count: { id: true } }),
        // completed paths per module for this user
        prisma.userPathProgress.groupBy({ by: ['pathId'], where: { userId, status: 'completed', path: { moduleId: { in: moduleIds } } }, _count: { id: true } })
            .then(async rows => {
                const paths = await prisma.path.findMany({ where: { id: { in: rows.map(r => r.pathId) } }, select: { id: true, moduleId: true } });
                const modMap = new Map(paths.map(p => [p.id, p.moduleId]));
                const acc = new Map();
                for (const r of rows) {
                    const mid = modMap.get(r.pathId);
                    if (mid) acc.set(mid, (acc.get(mid) ?? 0) + r._count.id);
                }
                return acc;
            }),
        // total steps per path
        prisma.step.groupBy({ by: ['pathId'], where: { pathId: { in: pathIds } }, _count: { id: true } }),
        // completed steps per path for this user
        prisma.userStepProgress.groupBy({ by: ['stepId'], where: { userId, status: 'completed', step: { pathId: { in: pathIds } } }, _count: { id: true } })
            .then(async rows => {
                const steps = await prisma.step.findMany({ where: { id: { in: rows.map(r => r.stepId) } }, select: { id: true, pathId: true } });
                const pathMap = new Map(steps.map(s => [s.id, s.pathId]));
                const acc = new Map();
                for (const r of rows) {
                    const pid = pathMap.get(r.stepId);
                    if (pid) acc.set(pid, (acc.get(pid) ?? 0) + r._count.id);
                }
                return acc;
            }),
    ]);

    // Convert groupBy arrays to Maps
    const totalModMap  = new Map(modCountByLevel.map(r => [r.levelId, r._count.id]));
    const totalPathMap = new Map(pathCountByModule.map(r => [r.moduleId, r._count.id]));
    const totalStepMap = new Map(stepCountByPath.map(r => [r.pathId, r._count.id]));

    // Build per-language result from pre-fetched data (zero extra DB queries)
    const languages = allLangs.map(lp => {
        const languageId    = lp.languageId;
        const currentLevel  = levelByLang.get(languageId) || null;
        const currentModule = currentLevel ? moduleByLevel.get(currentLevel.levelId) || null : null;
        const currentPath   = currentModule ? pathByModule.get(currentModule.moduleId) || null : null;
        const currentStep   = currentPath ? stepByPath.get(currentPath.pathId) || null : null;

        const totalModules    = currentLevel  ? (totalModMap.get(currentLevel.levelId)       ?? 0) : 0;
        const completedMods   = currentLevel  ? (completedModByLevel.get(currentLevel.levelId) ?? 0) : 0;
        const totalPaths      = currentModule ? (totalPathMap.get(currentModule.moduleId)    ?? 0) : 0;
        const completedPaths  = currentModule ? (completedPathByModule.get(currentModule.moduleId) ?? 0) : 0;
        const totalSteps      = currentPath   ? (totalStepMap.get(currentPath.pathId)        ?? 0) : 0;
        const completedSteps  = currentPath   ? (completedStepByPath.get(currentPath.pathId) ?? 0) : 0;

        return {
            language: {
                id: lp.language.id, name: lp.language.name, code: lp.language.code, flagUrl: lp.language.flagUrl,
                status: lp.status, progressPercentage: pct(lp.overallProgress), lastAccessedAt: lp.lastAccessedAt,
            },
            level: currentLevel ? {
                id: currentLevel.level.id, name: currentLevel.level.name, code: currentLevel.level.code,
                status: currentLevel.status, totalModules, completedModules: completedMods,
                progressPercentage: totalModules > 0 ? Math.round((completedMods / totalModules) * 100) : 0,
            } : null,
            module: currentModule ? {
                id: currentModule.module.id, title: currentModule.module.title,
                status: currentModule.status, totalPaths, completedPaths,
                progressPercentage: totalPaths > 0 ? Math.round((completedPaths / totalPaths) * 100) : 0,
            } : null,
            path: currentPath ? {
                id: currentPath.path.id, title: currentPath.path.title,
                status: currentPath.status, totalSteps, completedSteps,
                progressPercentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
            } : null,
            step: currentStep ? {
                id: currentStep.step.id, title: currentStep.step.title, stepType: currentStep.step.stepType,
                status: currentStep.status,
                progressPercentage: pct(currentStep.progressPercentage),
                score: currentStep.score != null ? pct(currentStep.score) : null,
            } : null,
        };
    });

    return languages;
}

// Vue parent : progression actuelle de son enfant
exports.getChildFullProgress = async (parentId, childId) => {
    const { AppError } = require('../../middleware/errorHandler');
    const child = await prisma.user.findFirst({
        where: { id: childId, parentId, accountType: 'sub_account_learner' },
        select: { id: true, username: true, email: true }
    });
    if (!child) throw new AppError(404, 'Child account not found or does not belong to you');
    const data = await computeCurrentProgress(childId);
    return { success: true, child, data };
};

// Vue enfant : sa propre progression actuelle
exports.getMyProgress = async (userId) => {
    const data = await computeCurrentProgress(userId);
    return { success: true, data };
};

// Basculer vers une langue (met à jour lastAccessedAt → remonte en tête)
exports.switchLanguage = async (userId, languageId) => {
    const { AppError } = require('../../middleware/errorHandler');

    const progress = await prisma.userLanguageProgress.findUnique({
        where: { userId_languageId: { userId, languageId } },
        include: { language: { select: { id: true, name: true, code: true, flagUrl: true } } }
    });
    if (!progress) throw new AppError(404, 'This language is not assigned to your account');

    await prisma.userLanguageProgress.update({
        where: { userId_languageId: { userId, languageId } },
        data: { lastAccessedAt: new Date() }
    });

    await cacheDel(`user:${userId}:progress`);
    const data = await computeCurrentProgress(userId);
    return { success: true, data };
};

// Récupérer les niveaux d'une langue (vue parent pour choisir pour l'enfant)
exports.getChildLanguageLevels = async (parentId, childId, languageId) => {
    const { AppError } = require('../../middleware/errorHandler');

    const child = await prisma.user.findFirst({
        where: { id: childId, parentId, accountType: 'sub_account_learner' }
    });
    if (!child) throw new AppError(404, 'Child account not found or does not belong to you');

    const levels = await prisma.level.findMany({
        where: { languageId, isActive: true },
        orderBy: { index: 'asc' },
        select: { id: true, code: true, name: true, description: true, index: true }
    });

    if (!levels.length) throw new AppError(404, 'No levels found for this language');

    return { success: true, data: levels };
};

// Assigner un niveau à un enfant (parent)
exports.assignLevelToChild = async (parentId, childId, languageId, levelId) => {
    const { AppError } = require('../../middleware/errorHandler');

    const child = await prisma.user.findFirst({
        where: { id: childId, parentId, accountType: 'sub_account_learner' }
    });
    if (!child) throw new AppError(404, 'Child account not found or does not belong to you');

    // Vérifier que la langue est assignée à l'enfant
    const langProgress = await prisma.userLanguageProgress.findUnique({
        where: { userId_languageId: { userId: childId, languageId } }
    });
    if (!langProgress) throw new AppError(400, 'Assign the language to this child before assigning a level');

    // Vérifier que le niveau appartient à cette langue
    const level = await prisma.level.findFirst({
        where: { id: levelId, languageId, isActive: true },
        select: { id: true, name: true, code: true }
    });
    if (!level) throw new AppError(404, 'Level not found for this language');

    // Marquer les niveaux inférieurs comme complétés + débloquer le niveau choisi
    await progressionService.initializeUserLanguageProgress(childId, languageId, levelId);

    const progress = await prisma.userLevelProgress.findUnique({
        where: { userId_levelId: { userId: childId, levelId } }
    });

    return {
        success: true,
        message: `Level "${level.name}" assigned to ${child.username} — niveaux précédents débloqués, module 1 débloqué`,
        data: { level, progress }
    };
};

// Progression utilisateur pour Language
exports.selectLanguageForUser = async (userId, languageId, levelId = null) => {
	const existing = await prisma.userLanguageProgress.findUnique({
		where: { userId_languageId: { userId, languageId } }
	});

	if (!existing) {
		// Première sélection → initialiser avec le niveau choisi (ou le premier par défaut)
		await progressionService.initializeUserLanguageProgress(userId, languageId, levelId);
	} else {
		// Déjà sélectionnée → juste mettre à jour lastAccessedAt
		await prisma.userLanguageProgress.update({
			where: { userId_languageId: { userId, languageId } },
			data: { lastAccessedAt: new Date() }
		});
	}

	return prisma.userLanguageProgress.findUnique({
		where: { userId_languageId: { userId, languageId } }
	});
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

exports.getAll = async () => {
	return cacheWrap('languages:all', () => prisma.language.findMany({
		orderBy: { index: 'asc' },
		include: { levels: { orderBy: { index: 'asc' } } }
	}), TTL.LONG);
};

exports.getById = async (id) => {
	return await prisma.language.findUnique({ where: { id } });
};

exports.getLanguageLevels = async (languageId) => {
	return cacheWrap(`language:${languageId}:levels`, async () => {
		// Vérifier langue + charger niveaux en 1 requête
		const language = await prisma.language.findUnique({
			where: { id: languageId },
			select: { id: true }
		});
		if (!language) return null;

		// Charger levels, puis modules+paths+steps en parallèle dès qu'on a les IDs
		const levels = await prisma.level.findMany({ where: { languageId }, orderBy: { index: 'asc' }, select: { id: true, name: true, code: true, index: true, isActive: true } });
		if (levels.length === 0) return [];

		const levelIds = levels.map(l => l.id);

		// modules dépend des levelIds — on les charge, puis paths et steps en parallèle
		const modules = await prisma.module.findMany({ where: { levelId: { in: levelIds } }, orderBy: { index: 'asc' } });

		const moduleIds = modules.map(m => m.id);
		// paths et steps sont indépendants entre eux — parallèle
		const [paths, steps] = await Promise.all([
			moduleIds.length > 0 ? prisma.path.findMany({ where: { moduleId: { in: moduleIds } }, orderBy: { index: 'asc' } }) : Promise.resolve([]),
			// steps dépend des pathIds mais on ne les a pas encore — on les charge après paths
			Promise.resolve(null),
		]);

		const pathIds = paths.map(p => p.id);
		const allSteps = pathIds.length > 0 ? await prisma.step.findMany({ where: { pathId: { in: pathIds } }, orderBy: { index: 'asc' } }) : [];

		// Assembler en mémoire via Maps (O(1))
		const stepsMap = new Map();
		allSteps.forEach(s => { if (!stepsMap.has(s.pathId)) stepsMap.set(s.pathId, []); stepsMap.get(s.pathId).push(s); });

		const pathsMap = new Map();
		paths.forEach(p => { if (!pathsMap.has(p.moduleId)) pathsMap.set(p.moduleId, []); pathsMap.get(p.moduleId).push({ ...p, steps: stepsMap.get(p.id) || [] }); });

		const modulesMap = new Map();
		modules.forEach(m => { if (!modulesMap.has(m.levelId)) modulesMap.set(m.levelId, []); modulesMap.get(m.levelId).push({ ...m, paths: pathsMap.get(m.id) || [] }); });

		return levels.map(level => ({ ...level, modules: modulesMap.get(level.id) || [] }));
	}, TTL.LONG);
};

exports.getLevelModules = async (languageId, levelId) => {
	// Valider langue + niveau en parallèle
	const [language, level] = await Promise.all([
		prisma.language.findUnique({ where: { id: languageId }, select: { id: true } }),
		prisma.level.findFirst({ where: { id: levelId, languageId }, select: { id: true, name: true } }),
	]);
	if (!language || !level) return null;

	const modules = await prisma.module.findMany({ where: { levelId: level.id }, orderBy: { index: 'asc' } });
	if (modules.length === 0) return { levelName: level.name, modules: [] };

	const moduleIds = modules.map(m => m.id);
	const paths = await prisma.path.findMany({ where: { moduleId: { in: moduleIds } }, orderBy: { index: 'asc' } });

	const pathIds = paths.map(p => p.id);
	const steps = pathIds.length > 0 ? await prisma.step.findMany({ where: { pathId: { in: pathIds } }, orderBy: { index: 'asc' } }) : [];

	const stepsMap = new Map();
	steps.forEach(s => { if (!stepsMap.has(s.pathId)) stepsMap.set(s.pathId, []); stepsMap.get(s.pathId).push(s); });

	const pathsMap = new Map();
	paths.forEach(p => { if (!pathsMap.has(p.moduleId)) pathsMap.set(p.moduleId, []); pathsMap.get(p.moduleId).push({ ...p, steps: stepsMap.get(p.id) || [] }); });

	return {
		levelName: level.name,
		modules: modules.map(m => ({ ...m, paths: pathsMap.get(m.id) || [] }))
	};
};

exports.getModulePaths = async (languageId, levelId, moduleId) => {
	// Valider langue + niveau + module en parallèle (les 3 sont indépendants par ID)
	const [language, level, module] = await Promise.all([
		prisma.language.findUnique({ where: { id: languageId }, select: { id: true } }),
		prisma.level.findFirst({ where: { id: levelId, languageId }, select: { id: true } }),
		prisma.module.findFirst({ where: { id: moduleId, levelId }, select: { id: true, name: true } }),
	]);
	if (!language || !level || !module) return null;

	const paths = await prisma.path.findMany({ where: { moduleId: module.id }, orderBy: { index: 'asc' } });
	if (paths.length === 0) return { moduleName: module.name, paths: [] };

	const pathIds = paths.map(p => p.id);
	const steps = await prisma.step.findMany({ where: { pathId: { in: pathIds } }, orderBy: { index: 'asc' } });

	const stepsMap = new Map();
	steps.forEach(s => { if (!stepsMap.has(s.pathId)) stepsMap.set(s.pathId, []); stepsMap.get(s.pathId).push(s); });

	return {
		moduleName: module.name,
		paths: paths.map(p => ({ ...p, steps: stepsMap.get(p.id) || [] }))
	};
};

exports.getPathSteps = async (languageId, levelId, moduleId, pathId) => {
	// Valider toute la hiérarchie en 1 seule requête via relations imbriquées
	const path = await prisma.path.findFirst({
		where: {
			id: pathId,
			moduleId,
			module: { id: moduleId, levelId, level: { id: levelId, languageId } }
		},
		select: { id: true, title: true }
	});
	if (!path) return null;

	const steps = await prisma.step.findMany({ where: { pathId: path.id }, orderBy: { index: 'asc' } });
	return { pathName: path.title, steps };
};

exports.getStepContent = async (languageId, levelId, moduleId, pathId, stepId) => {
	// Valider toute la hiérarchie + charger l'étape en 1 requête
	const step = await prisma.step.findFirst({
		where: {
			id: stepId,
			pathId,
			path: { id: pathId, moduleId, module: { id: moduleId, levelId, level: { id: levelId, languageId } } }
		}
	});
	if (!step) return null;

	// Charger le contenu de l'étape en parallèle (3 requêtes simultanées au lieu de 3 séquentielles)
	const [courses, exercises, quizzes] = await Promise.all([
		prisma.lesson.findMany({ where: { stepId: step.id } }),
		prisma.exercise.findMany({ where: { stepId: step.id } }),
		prisma.quiz.findMany({ where: { stepId: step.id }, include: { questions: true } }),
	]);

	return { stepName: step.title, step, courses, exercises, quizzes };
};

exports.update = async (id, data) => {
	const result = await prisma.language.update({ where: { id }, data });
	await cacheDel('languages:all', 'languages:active', `language:${id}:levels`, `language:${id}:available-levels`);
	return result;
};

exports.remove = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) return null;
	await prisma.language.delete({ where: { id } });
	await cacheDel('languages:all', 'languages:active', `language:${id}:levels`, `language:${id}:available-levels`);
	return true;
};

// Activer une langue
exports.activateLanguage = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) throw new Error('Langue introuvable');
	const result = await prisma.language.update({ where: { id }, data: { isActive: true } });
	await cacheDel('languages:all', 'languages:active', `language:${id}:levels`, `language:${id}:available-levels`);
	return result;
};

// Désactiver une langue
exports.deactivateLanguage = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) throw new Error('Langue introuvable');
	const result = await prisma.language.update({ where: { id }, data: { isActive: false } });
	await cacheDel('languages:all', 'languages:active', `language:${id}:levels`, `language:${id}:available-levels`);
	return result;
};

// Récupérer toutes les langues actives
exports.getActiveLanguages = async () => {
	return cacheWrap('languages:active', () => prisma.language.findMany({
		where: { isActive: true },
		orderBy: { index: 'asc' },
		include: { levels: { where: { isActive: true }, orderBy: { index: 'asc' } } }
	}), TTL.LONG);
};

// Récupérer les niveaux disponibles pour une langue
exports.getAvailableLevels = async (languageId) => {
	return cacheWrap(`language:${languageId}:available-levels`, async () => {
		const language = await prisma.language.findUnique({
			where: { id: languageId },
			include: {
				levels: {
					where: { isActive: true },
					orderBy: { index: 'asc' },
					select: { id: true, code: true, name: true, description: true, index: true, isActive: true, _count: { select: { modules: true } } }
				}
			}
		});
		if (!language) throw new Error('Langue introuvable');
		return { language: { id: language.id, code: language.code, name: language.name, isActive: language.isActive }, levels: language.levels };
	}, TTL.LONG);
};