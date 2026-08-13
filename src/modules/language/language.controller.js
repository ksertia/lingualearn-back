const service = require('./language.service');

// Progression endpoints
// Progression actuelle de l'enfant connecté (vue enfant)
exports.getMyProgress = async (req, res, next) => {
    try {
        const result = await service.getMyProgress(req.user.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// Progression actuelle d'un enfant (vue parent)
exports.getChildFullProgress = async (req, res, next) => {
    try {
        const { childId } = req.params;
        const result = await service.getChildFullProgress(req.user.id, childId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// Assigner une langue à un compte enfant (parent connecté)
exports.assignLanguageToChild = async (req, res, next) => {
    try {
        const { childId, languageId } = req.params;
        const result = await service.assignLanguageToChild(req.user.id, childId, languageId);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

// Récupérer les langues d'un enfant (vue parent)
exports.getChildLanguages = async (req, res, next) => {
    try {
        const { childId } = req.params;
        const result = await service.getChildLanguages(req.user.id, childId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// Voir les niveaux d'une langue pour un enfant (parent)
exports.getChildLanguageLevels = async (req, res, next) => {
    try {
        const { childId, languageId } = req.params;
        const result = await service.getChildLanguageLevels(req.user.id, childId, languageId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

// Assigner un niveau à un enfant (parent)
exports.assignLevelToChild = async (req, res, next) => {
    try {
        const { childId, languageId, levelId } = req.params;
        const result = await service.assignLevelToChild(req.user.id, childId, languageId, levelId);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

exports.unassignLanguageFromChild = async (req, res, next) => {
    try {
        const { childId, languageId } = req.params;
        const result = await service.unassignLanguageFromChild(req.user.id, childId, languageId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.switchLanguage = async (req, res, next) => {
    try {
        const { languageId } = req.params;
        const result = await service.switchLanguage(req.user.id, languageId);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

exports.selectLanguage = async (req, res, next) => {
       try {
	       const { userId, languageId } = req.params;
	       const { levelId } = req.body;
	       console.log(`[1] selectLanguage → userId: ${userId} | languageId: ${languageId}`);
	       const progress = await service.selectLanguageForUser(userId, languageId, levelId || null);
	       res.status(201).json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};

exports.startLanguage = async (req, res, next) => {
       try {
	       const { userId, languageId } = req.params;
	       const progress = await service.startLanguageForUser(userId, languageId);
	       res.json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};

exports.completeLanguage = async (req, res, next) => {
       try {
	       const { userId, languageId } = req.params;
	       const progress = await service.completeLanguageForUser(userId, languageId);
	       res.json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};
exports.getByUserId = async (req, res, next) => {
	try {
		const languages = await service.getLanguagesByUserId(req.params.userId);
		if (!languages || languages.length === 0) {
			return res.status(404).json({ success: false, error: 'Aucune langue trouvée pour cet utilisateur' });
		}
		res.json({ success: true, data: languages });
	} catch (err) {
		next(err);
	}
};


exports.create = async (req, res, next) => {
	try {
		const language = await service.create(req.body);
		res.status(201).json({ success: true, data: language });
	} catch (err) {
		next(err);
	}
};

exports.getAll = async (req, res, next) => {
	try {
		const languages = await service.getAll();
		res.json({ success: true, data: languages });
	} catch (err) {
		next(err);
	}
};

exports.getById = async (req, res, next) => {
	try {
		const language = await service.getById(req.params.id);
		if (!language) return res.status(404).json({ success: false, error: 'Langue non trouvée' });
		res.json({ success: true, data: language });
	} catch (err) {
		next(err);
	}
};

exports.getLanguageLevels = async (req, res, next) => {
	try {
		const { languageId } = req.params;
		const levels = await service.getLanguageLevels(languageId);
		if (!levels) {
			return res.status(404).json({ success: false, error: 'Langue non trouvée' });
		}
		res.json({ success: true, data: { languageId, levels } });
	} catch (err) {
		next(err);
	}
};

exports.getLevelModules = async (req, res, next) => {
	try {
		const { languageId, levelId } = req.params;
		const modules = await service.getLevelModules(languageId, levelId);
		if (!modules) {
			return res.status(404).json({ success: false, error: 'Langue ou niveau non trouvé' });
		}
		res.json({ success: true, data: { languageId, levelId, levelName: modules.levelName, modules: modules.modules } });
	} catch (err) {
		next(err);
	}
};

exports.getModuleThemes = async (req, res, next) => {
	try {
		const { languageId, levelId, moduleId } = req.params;
		const themes = await service.getModuleThemes(languageId, levelId, moduleId);
		if (!themes) {
			return res.status(404).json({ success: false, error: 'Langue, niveau ou module non trouvé' });
		}
		res.json({ success: true, data: { languageId, levelId, moduleId, moduleName: themes.moduleName, themes: themes.themes } });
	} catch (err) {
		next(err);
	}
};

exports.getThemeSubThemes = async (req, res, next) => {
	try {
		const { languageId, levelId, moduleId, themeId } = req.params;
		const subThemes = await service.getThemeSubThemes(languageId, levelId, moduleId, themeId);
		if (!subThemes) {
			return res.status(404).json({ success: false, error: 'Langue, niveau, module ou thème non trouvé' });
		}
		res.json({ success: true, data: { languageId, levelId, moduleId, themeId, themeName: subThemes.themeName, subThemes: subThemes.subThemes } });
	} catch (err) {
		next(err);
	}
};

exports.getSubThemeContent = async (req, res, next) => {
	try {
		const { languageId, levelId, moduleId, themeId, subThemeId } = req.params;
		const content = await service.getSubThemeContent(languageId, levelId, moduleId, themeId, subThemeId);
		if (!content) {
			return res.status(404).json({ success: false, error: 'Langue, niveau, module, thème ou sous-thème non trouvé' });
		}
		res.json({ success: true, data: { languageId, levelId, moduleId, themeId, subThemeId, subThemeName: content.subThemeName, subTheme: content.subTheme, contents: content.contents, evaluation: content.evaluation } });
	} catch (err) {
		next(err);
	}
};

exports.update = async (req, res, next) => {
	try {
		const language = await service.update(req.params.id, req.body);
		if (!language) return res.status(404).json({ success: false, error: 'Langue non trouvée' });
		res.json({ success: true, data: language });
	} catch (err) {
		next(err);
	}
};

exports.remove = async (req, res, next) => {
	try {
		const deleted = await service.remove(req.params.id);
		if (!deleted) return res.status(404).json({ success: false, error: 'Langue non trouvée' });
		res.status(204).send();
	} catch (err) {
		next(err);
	}
};

// Activer une langue
exports.activateLanguage = async (req, res, next) => {
	try {
		const language = await service.activateLanguage(req.params.id);
		res.json({ success: true, message: 'Langue activée avec succès', data: language });
	} catch (err) {
		next(err);
	}
};

// Désactiver une langue
exports.deactivateLanguage = async (req, res, next) => {
	try {
		const language = await service.deactivateLanguage(req.params.id);
		res.json({ success: true, message: 'Langue désactivée avec succès', data: language });
	} catch (err) {
		next(err);
	}
};

// Récupérer toutes les langues actives
exports.getActiveLanguages = async (req, res, next) => {
	try {
		const languages = await service.getActiveLanguages();
		res.json({ success: true, data: languages });
	} catch (err) {
		next(err);
	}
};

// Récupérer les niveaux disponibles pour une langue
exports.getAvailableLevels = async (req, res, next) => {
	try {
		const result = await service.getAvailableLevels(req.params.id);
		res.json({ success: true, data: result });
	} catch (err) {
		next(err);
	}
};
