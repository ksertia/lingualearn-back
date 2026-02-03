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

