async function getByUserId(req, res, next) {
	try {
		const levels = await service.getLevelsByUserId(req.params.userId);
		if (!levels || levels.length === 0) {
			return res.status(404).json({ error: 'Aucun niveau trouvé pour cet utilisateur' });
		}
		res.json({ data: levels });
	} catch (err) {
		next(err);
	}
}

module.exports.getByUserId = getByUserId;
const service = require('./Level.service');
const { createLevelSchema, updateLevelSchema } = require('./Level.schema');

async function create(req, res, next) {
	try {
		const { error, value } = createLevelSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const level = await service.createLevel({
			name: value.name,
			description: value.description,
			learningPathId: value.learningPathId,
			languageId: value.languageId,
			code: value.code,
			index: value.index,
			isActive: value.isActive
		});
		res.status(201).json(level);
	} catch (err) {
		next(err);
	}
}

async function getAll(req, res, next) {
	try {
		const levels = await service.getAllLevels();
		res.json(levels);
	} catch (err) {
		next(err);
	}
}

async function getById(req, res, next) {
	try {
		const level = await service.getLevelById(req.params.id);
		if (!level) return res.status(404).json({ error: 'Level not found' });
		res.json(level);
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const { error, value } = updateLevelSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const level = await service.updateLevel(req.params.id, value);
		res.json(level);
	} catch (err) {
		next(err);
	}
}

async function remove(req, res, next) {
	try {
		await service.deleteLevel(req.params.id);
		res.status(204).send();
	} catch (err) {
		next(err);
	}
}


// Progression endpoints
exports.selectLevel = async (req, res, next) => {
       try {
	       const { userId, levelId } = req.params;
	       const progress = await service.selectLevelForUser(userId, levelId);
	       res.status(201).json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};

exports.startLevel = async (req, res, next) => {
       try {
	       const { userId, levelId } = req.params;
	       const progress = await service.startLevelForUser(userId, levelId);
	       res.json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};

exports.completeLevel = async (req, res, next) => {
       try {
	       const { userId, levelId } = req.params;
	       const progress = await service.completeLevelForUser(userId, levelId);
	       res.json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};

module.exports = {
	create,
	getAll,
	getById,
	update,
	remove,
	getByUserId,
	selectLevel: exports.selectLevel,
	startLevel: exports.startLevel,
	completeLevel: exports.completeLevel
};