const fs = require('fs');
const service = require('./standard.service');
const { completeSessionSchema, upsertSessionSchema, reorderSchema } = require('./standard.schema');
const { moveToFinalStorage } = require('../../utils/uploadService');

exports.getNextSession = async (req, res, next) => {
	try {
		const { languageId } = req.params;
		const { userId } = req.query;
		const data = await service.getNextSession(languageId, userId);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.getNextSessionPreview = async (req, res, next) => {
	try {
		const { languageId } = req.params;
		const { userId } = req.query;
		const data = await service.getNextSessionPreview(languageId, userId);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.completeSession = async (req, res, next) => {
	try {
		const { error, value } = completeSessionSchema.validate(req.body);
		if (error) return res.status(400).json({ success: false, error: error.details[0].message });

		const isPrivileged = ['admin', 'plateform_manager'].includes(req.user.accountType);
		if (!isPrivileged && value.userId !== req.user.id) {
			return res.status(403).json({ success: false, error: 'Vous ne pouvez enregistrer un résultat que pour vous-même.' });
		}

		const data = await service.completeSession(req.params.sessionId, value);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.getUserLanguageStats = async (req, res, next) => {
	try {
		const { userId, languageId } = req.params;
		const data = await service.getUserLanguageStats(userId, languageId);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.getChildLanguageStats = async (req, res, next) => {
	try {
		const { childId, languageId } = req.params;
		const data = await service.getChildLanguageStats(req.user.id, childId, languageId);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

// ==================== ADMINISTRATION ====================

exports.listSessionsForAdmin = async (req, res, next) => {
	try {
		const { languageId } = req.params;
		const data = await service.listSessionsForAdmin(languageId);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.createSession = async (req, res, next) => {
	try {
		const { error, value } = upsertSessionSchema.validate(req.body);
		if (error) return res.status(400).json({ success: false, error: error.details[0].message });

		const data = await service.createSession(value);
		res.status(201).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.updateSession = async (req, res, next) => {
	try {
		const { error, value } = upsertSessionSchema.fork(['languageId', 'position', 'title', 'items'], (s) => s.optional()).validate(req.body);
		if (error) return res.status(400).json({ success: false, error: error.details[0].message });

		const data = await service.updateSession(req.params.id, value);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.publishSession = async (req, res, next) => {
	try {
		const { isPublished, reviewedBy } = req.body;
		const data = await service.setPublishStatus(req.params.id, !!isPublished, reviewedBy);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.reorderSessions = async (req, res, next) => {
	try {
		const { error, value } = reorderSchema.validate(req.body);
		if (error) return res.status(400).json({ success: false, error: error.details[0].message });

		const data = await service.reorderSessions(req.params.languageId, value.order);
		res.status(200).json({ success: true, data });
	} catch (err) {
		next(err);
	}
};

exports.setItemAudio = async (req, res, next) => {
	try {
		if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier audio reçu.' });

		const { url } = moveToFinalStorage(req.file.path, 'audio', req.file.originalname);
		const data = await service.setItemAudioUrl(req.params.id, url);
		res.status(200).json({ success: true, data: { id: data.id, audioUrl: data.audioUrl } });
	} catch (err) {
		if (req.file) fs.unlink(req.file.path, () => {});
		next(err);
	}
};
