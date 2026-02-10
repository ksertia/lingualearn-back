// Progression endpoints
exports.selectPath = async (req, res, next) => {
       try {
	       const { userId, pathId } = req.params;
	       const progress = await service.selectPathForUser(userId, pathId);
	       res.status(201).json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};

exports.startPath = async (req, res, next) => {
       try {
	       const { userId, pathId } = req.params;
	       const progress = await service.startPathForUser(userId, pathId);
	       res.json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};

exports.completePath = async (req, res, next) => {
       try {
	       const { userId, pathId } = req.params;
	       const progress = await service.completePathForUser(userId, pathId);
	       res.json({ success: true, data: progress });
       } catch (err) {
	       next(err);
       }
};

const service = require('./learning.path.service');
const { createLearningPathSchema, updateLearningPathSchema } = require('./learning.path.schema');

async function getByUserId(req, res, next) {
       try {
	       const paths = await service.getPathsByUserId(req.params.userId);
	       if (!paths || paths.length === 0) {
		       return res.status(404).json({ error: 'Aucun parcours trouvé pour cet utilisateur' });
	       }
	       res.json({ data: paths });
       } catch (err) {
	       next(err);
       }
}

module.exports.getByUserId = getByUserId;

// Helper to pick only allowed fields for Path creation
function pickPathFields(body) {
	return {
		moduleId: body.moduleId,
		title: body.title,
		description: body.description,
		index: body.index,
		tempResaListime: body.tempResaListime,
		thumbnailUrl: body.thumbnailUrl,
		difficulty: body.difficulty,
		estimatedHours: body.estimatedHours,
		isActive: body.isActive
	};
}

async function create(req, res, next) {
	try {
		const { error, value } = createLearningPathSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		// All required fields for Path creation
		const data = pickPathFields(value);
		if (!data.moduleId) return res.status(400).json({ error: 'moduleId is required' });
		const path = await service.createPath(data);
		res.status(201).json(path);
	} catch (err) {
		next(err);
	}
}

async function getAll(req, res, next) {
	try {
		const paths = await service.getAllPaths();
		res.json(paths);
	} catch (err) {
		next(err);
	}
}

async function getById(req, res, next) {
	try {
		const path = await service.getPathById(req.params.id);
		if (!path) return res.status(404).json({ error: 'Path not found' });
		res.json(path);
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const { error, value } = updateLearningPathSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const data = pickPathFields(value);
		const path = await service.updatePath(req.params.id, data);
		res.json(path);
	} catch (err) {
		next(err);
	}
}

async function remove(req, res, next) {
	try {
		await service.deletePath(req.params.id);
		res.status(204).send();
	} catch (err) {
		next(err);
	}
}

module.exports = {
	create,
	getAll,
	getById,
	update,
	remove,
	getByUserId,
	selectPath: exports.selectPath,
	startPath: exports.startPath,
	completePath: exports.completePath
};
