const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, cacheInvalidatePattern, TTL } = require('../../utils/cache');

// Récupérer toutes les langues liées à un utilisateur (via userLanguageProgress)
exports.getLanguagesByUserId = async (userId) => {
	// Récupérer TOUTES les langues actives avec leur progression
	const languages = await prisma.language.findMany({
		where: { isActive: true },
		orderBy: { createdAt: 'asc' },
		include: {
			userProgress: {
				where: { userId },
				select: { status: true, overallProgress: true, totalXp: true, totalTimeMinutes: true, startedAt: true, completedAt: true, lastAccessedAt: true }
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

    // Initialiser la progression de langue (accès libre — aucun déblocage requis)
    await prisma.userLanguageProgress.upsert({
        where: { userId_languageId: { userId: childId, languageId } },
        update: { lastAccessedAt: new Date() },
        create: { userId: childId, languageId, startedAt: new Date(), lastAccessedAt: new Date() }
    });

    // Invalider le cache pour que my-progress reflète immédiatement la nouvelle langue
    await cacheDel(`user:${childId}:progress`, `user-levels:${childId}`);

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

    // Supprimer en cascade : sous-thème → module → niveau → langue
    await prisma.userSubThemeProgress.deleteMany({ where: { userId: childId, subTheme: { theme: { module: { level: { languageId } } } } } });
    await prisma.userModuleProgress.deleteMany({ where: { userId: childId, module: { level: { languageId } } } });
    await prisma.userLevelProgress.deleteMany({ where: { userId: childId, level: { languageId } } });
    await prisma.userLanguageProgress.delete({ where: { userId_languageId: { userId: childId, languageId } } });

    await cacheDel(`user:${childId}:progress`, `user-levels:${childId}`);

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
            userProgress: { where: { userId: childId }, select: { status: true, overallProgress: true, totalXp: true, startedAt: true } }
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

    // Batch load level/module/sub-theme progress for all languages at once — accès libre, aucun filtre de statut
    const [allLevelProgs, allModuleProgs, allSubThemeProgs] = await Promise.all([
        // Niveaux : trier par index ASC pour prendre le plus bas (Débutant avant Intermédiaire)
        prisma.userLevelProgress.findMany({
            where: { userId, level: { languageId: { in: languageIds } } },
            orderBy: { level: { index: 'asc' } },
            include: { level: { select: { id: true, name: true, code: true, languageId: true, index: true } } }
        }),
        prisma.userModuleProgress.findMany({
            where: { userId },
            orderBy: [{ lastAccessedAt: 'desc' }, { module: { index: 'asc' } }],
            include: { module: { select: { id: true, title: true, levelId: true } } }
        }),
        prisma.userSubThemeProgress.findMany({
            where: { userId },
            orderBy: [{ lastAccessedAt: 'desc' }, { subTheme: { index: 'asc' } }],
            include: { subTheme: { select: { id: true, title: true, themeId: true, theme: { select: { moduleId: true } } } } }
        }),
    ]);

    // Build maps for O(1) lookup per language/level/module
    const levelByLang     = new Map(); // languageId → niveau le plus récemment accédé
    const moduleByLevel   = new Map(); // levelId    → module le plus récemment accédé
    const subThemeByModule = new Map(); // moduleId  → sous-thème le plus récemment accédé

    for (const lp of allLevelProgs) {
        const langId = lp.level.languageId;
        const existing = levelByLang.get(langId);
        if (!existing) {
            levelByLang.set(langId, lp);
        } else {
            const newDate = lp.lastAccessedAt ? new Date(lp.lastAccessedAt).getTime() : 0;
            const exDate  = existing.lastAccessedAt ? new Date(existing.lastAccessedAt).getTime() : 0;
            if (newDate > exDate) levelByLang.set(langId, lp);
        }
    }

    const validLevelIds = new Set([...levelByLang.values()].map(lp => lp.levelId));

    for (const mp of allModuleProgs) {
        if (validLevelIds.has(mp.module.levelId) && !moduleByLevel.has(mp.module.levelId))
            moduleByLevel.set(mp.module.levelId, mp);
    }

    const validModuleIds = new Set([...moduleByLevel.values()].map(mp => mp.moduleId));

    for (const sp of allSubThemeProgs) {
        const modId = sp.subTheme.theme.moduleId;
        if (validModuleIds.has(modId) && !subThemeByModule.has(modId))
            subThemeByModule.set(modId, sp);
    }

    // Collect all IDs we need counts for, then batch-fetch counts
    const levelIds  = [...new Set(allLevelProgs.map(l => l.levelId))];
    const moduleIds = [...new Set(allModuleProgs.map(m => m.moduleId))];

    const [modCountByLevel, subThemeCountByModule] = await Promise.all([
        // total modules per level
        prisma.module.groupBy({ by: ['levelId'], where: { levelId: { in: levelIds } }, _count: { id: true } }),
        // total sub-themes per module (via theme)
        prisma.subTheme.findMany({ where: { theme: { moduleId: { in: moduleIds } } }, select: { theme: { select: { moduleId: true } } } })
            .then(rows => {
                const acc = new Map();
                for (const r of rows) acc.set(r.theme.moduleId, (acc.get(r.theme.moduleId) ?? 0) + 1);
                return acc;
            }),
    ]);

    const totalModMap = new Map(modCountByLevel.map(r => [r.levelId, r._count.id]));

    // Build per-language result from pre-fetched data (zero extra DB queries)
    const languages = allLangs.map(lp => {
        const languageId     = lp.languageId;
        const currentLevel   = levelByLang.get(languageId) || null;
        const currentModule  = currentLevel ? moduleByLevel.get(currentLevel.levelId) || null : null;
        const currentSubTheme = currentModule ? subThemeByModule.get(currentModule.moduleId) || null : null;

        const totalModules   = currentLevel  ? (totalModMap.get(currentLevel.levelId) ?? 0) : 0;
        const totalSubThemes = currentModule ? (subThemeCountByModule.get(currentModule.moduleId) ?? 0) : 0;

        return {
            language: {
                id: lp.language.id, name: lp.language.name, code: lp.language.code, flagUrl: lp.language.flagUrl,
                progressPercentage: pct(lp.overallProgress), lastAccessedAt: lp.lastAccessedAt,
            },
            level: currentLevel ? {
                id: currentLevel.level.id, name: currentLevel.level.name, code: currentLevel.level.code,
                totalModules, progressPercentage: pct(currentLevel.progressPercentage),
            } : null,
            module: currentModule ? {
                id: currentModule.module.id, title: currentModule.module.title,
                totalSubThemes, progressPercentage: pct(currentModule.progressPercentage),
            } : null,
            subTheme: currentSubTheme ? {
                id: currentSubTheme.subTheme.id, title: currentSubTheme.subTheme.title,
                progressPercentage: pct(currentSubTheme.progressPercentage),
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

    try {
        await prisma.userLanguageProgress.update({
            where: { userId_languageId: { userId, languageId } },
            data: { lastAccessedAt: new Date() }
        });
    } catch (err) {
        if (err.code === 'P2025') throw new AppError(404, 'This language is not assigned to your account');
        throw err;
    }

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

    // Sélectionner ce niveau pour l'enfant — accès libre, aucun déblocage requis
    const progress = await prisma.userLevelProgress.upsert({
        where: { userId_levelId: { userId: childId, levelId } },
        update: { lastAccessedAt: new Date() },
        create: { userId: childId, levelId, startedAt: new Date(), lastAccessedAt: new Date() }
    });

    return {
        success: true,
        message: `Level "${level.name}" assigned to ${child.username}`,
        data: { level, progress }
    };
};

// Progression utilisateur pour Language
exports.selectLanguageForUser = async (userId, languageId, levelId = null) => {
	const levelService = require('../Level/Level.service');

	// Créer la row langue si elle n'existe pas encore
	const progress = await prisma.userLanguageProgress.upsert({
		where: { userId_languageId: { userId, languageId } },
		update: { lastAccessedAt: new Date() },
		create: {
			userId,
			languageId,
			startedAt: new Date(),
			lastAccessedAt: new Date()
		}
	});

	// Si un levelId est fourni ET qu'il appartient bien à cette langue, l'initialiser
	if (levelId) {
		const level = await prisma.level.findFirst({
			where: { id: levelId, languageId, isActive: true },
			select: { id: true }
		});
		if (level) {
			await levelService.selectLevelForUser(userId, levelId);
		}
	}
	// Pas d'auto-init si pas de levelId : selectLevel sera appelé juste après par le frontend

	await cacheDel(`user:${userId}:progress`, `user-levels:${userId}`);
	return progress;
};

exports.startLanguageForUser = async (userId, languageId) => {
       return prisma.userLanguageProgress.update({
	       where: { userId_languageId: { userId, languageId } },
	       data: { startedAt: new Date() }
       });
};

exports.completeLanguageForUser = async (userId, languageId) => {
       return prisma.userLanguageProgress.update({
	       where: { userId_languageId: { userId, languageId } },
	       data: { completedAt: new Date() }
       });
};

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

		// Charger levels, puis modules+thèmes+sous-thèmes en parallèle dès qu'on a les IDs
		const levels = await prisma.level.findMany({ where: { languageId }, orderBy: { index: 'asc' }, select: { id: true, name: true, code: true, index: true, isActive: true } });
		if (levels.length === 0) return [];

		const levelIds = levels.map(l => l.id);

		const modules = await prisma.module.findMany({ where: { levelId: { in: levelIds } }, orderBy: { index: 'asc' } });

		const moduleIds = modules.map(m => m.id);
		const themes = moduleIds.length > 0 ? await prisma.theme.findMany({ where: { moduleId: { in: moduleIds } }, orderBy: { index: 'asc' } }) : [];

		const themeIds = themes.map(t => t.id);
		const allSubThemes = themeIds.length > 0 ? await prisma.subTheme.findMany({ where: { themeId: { in: themeIds } }, orderBy: { index: 'asc' } }) : [];

		// Assembler en mémoire via Maps (O(1))
		const subThemesMap = new Map();
		allSubThemes.forEach(s => { if (!subThemesMap.has(s.themeId)) subThemesMap.set(s.themeId, []); subThemesMap.get(s.themeId).push(s); });

		const themesMap = new Map();
		themes.forEach(t => { if (!themesMap.has(t.moduleId)) themesMap.set(t.moduleId, []); themesMap.get(t.moduleId).push({ ...t, subThemes: subThemesMap.get(t.id) || [] }); });

		const modulesMap = new Map();
		modules.forEach(m => { if (!modulesMap.has(m.levelId)) modulesMap.set(m.levelId, []); modulesMap.get(m.levelId).push({ ...m, themes: themesMap.get(m.id) || [] }); });

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
	const themes = await prisma.theme.findMany({ where: { moduleId: { in: moduleIds } }, orderBy: { index: 'asc' } });

	const themeIds = themes.map(t => t.id);
	const subThemes = themeIds.length > 0 ? await prisma.subTheme.findMany({ where: { themeId: { in: themeIds } }, orderBy: { index: 'asc' } }) : [];

	const subThemesMap = new Map();
	subThemes.forEach(s => { if (!subThemesMap.has(s.themeId)) subThemesMap.set(s.themeId, []); subThemesMap.get(s.themeId).push(s); });

	const themesMap = new Map();
	themes.forEach(t => { if (!themesMap.has(t.moduleId)) themesMap.set(t.moduleId, []); themesMap.get(t.moduleId).push({ ...t, subThemes: subThemesMap.get(t.id) || [] }); });

	return {
		levelName: level.name,
		modules: modules.map(m => ({ ...m, themes: themesMap.get(m.id) || [] }))
	};
};

exports.getModuleThemes = async (languageId, levelId, moduleId) => {
	// Valider langue + niveau + module en parallèle (les 3 sont indépendants par ID)
	const [language, level, module] = await Promise.all([
		prisma.language.findUnique({ where: { id: languageId }, select: { id: true } }),
		prisma.level.findFirst({ where: { id: levelId, languageId }, select: { id: true } }),
		prisma.module.findFirst({ where: { id: moduleId, levelId }, select: { id: true, title: true } }),
	]);
	if (!language || !level || !module) return null;

	const themes = await prisma.theme.findMany({ where: { moduleId: module.id }, orderBy: { index: 'asc' } });
	if (themes.length === 0) return { moduleName: module.title, themes: [] };

	const themeIds = themes.map(t => t.id);
	const subThemes = await prisma.subTheme.findMany({ where: { themeId: { in: themeIds } }, orderBy: { index: 'asc' } });

	const subThemesMap = new Map();
	subThemes.forEach(s => { if (!subThemesMap.has(s.themeId)) subThemesMap.set(s.themeId, []); subThemesMap.get(s.themeId).push(s); });

	return {
		moduleName: module.title,
		themes: themes.map(t => ({ ...t, subThemes: subThemesMap.get(t.id) || [] }))
	};
};

exports.getThemeSubThemes = async (languageId, levelId, moduleId, themeId) => {
	// Valider toute la hiérarchie en 1 seule requête via relations imbriquées
	const theme = await prisma.theme.findFirst({
		where: {
			id: themeId,
			moduleId,
			module: { id: moduleId, levelId, level: { id: levelId, languageId } }
		},
		select: { id: true, title: true }
	});
	if (!theme) return null;

	const subThemes = await prisma.subTheme.findMany({ where: { themeId: theme.id }, orderBy: { index: 'asc' } });
	return { themeName: theme.title, subThemes };
};

exports.getSubThemeContent = async (languageId, levelId, moduleId, themeId, subThemeId) => {
	// Valider toute la hiérarchie + charger le sous-thème en 1 requête
	const subTheme = await prisma.subTheme.findFirst({
		where: {
			id: subThemeId,
			themeId,
			theme: { id: themeId, moduleId, module: { id: moduleId, levelId, level: { id: levelId, languageId } } }
		}
	});
	if (!subTheme) return null;

	// Charger le contenu du sous-thème en parallèle (2 requêtes simultanées)
	const [contents, evaluation] = await Promise.all([
		prisma.content.findMany({ where: { subThemeId: subTheme.id }, orderBy: { index: 'asc' } }),
		prisma.evaluation.findUnique({ where: { subThemeId: subTheme.id } }),
	]);

	return { subThemeName: subTheme.title, subTheme, contents, evaluation };
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