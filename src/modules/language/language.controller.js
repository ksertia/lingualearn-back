// Progression endpoints
exports.selectLanguage = async (req, res, next) => {
       try {
	       const { userId, languageId } = req.params;
	       const progress = await service.selectLanguageForUser(userId, languageId);
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
const service = require('./language.service');

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

exports.getModulePaths = async (req, res, next) => {
	try {
		const { languageId, levelId, moduleId } = req.params;
		const paths = await service.getModulePaths(languageId, levelId, moduleId);
		if (!paths) {
			return res.status(404).json({ success: false, error: 'Langue, niveau ou module non trouvé' });
		}
		res.json({ success: true, data: { languageId, levelId, moduleId, moduleName: paths.moduleName, paths: paths.paths } });
	} catch (err) {
		next(err);
	}
};

exports.getPathSteps = async (req, res, next) => {
	try {
		const { languageId, levelId, moduleId, pathId } = req.params;
		const steps = await service.getPathSteps(languageId, levelId, moduleId, pathId);
		if (!steps) {
			return res.status(404).json({ success: false, error: 'Langue, niveau, module ou parcours non trouvé' });
		}
		res.json({ success: true, data: { languageId, levelId, moduleId, pathId, pathName: steps.pathName, steps: steps.steps } });
	} catch (err) {
		next(err);
	}
};

exports.getStepContent = async (req, res, next) => {
	try {
		const { languageId, levelId, moduleId, pathId, stepId } = req.params;
		const content = await service.getStepContent(languageId, levelId, moduleId, pathId, stepId);
		if (!content) {
			return res.status(404).json({ success: false, error: 'Langue, niveau, module, parcours ou étape non trouvé' });
		}
		res.json({ success: true, data: { languageId, levelId, moduleId, pathId, stepId, stepName: content.stepName, step: content.step, courses: content.courses, exercises: content.exercises, quizzes: content.quizzes } });
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

