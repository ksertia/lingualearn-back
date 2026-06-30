const service = require('./learning.path.service');
const { createLearningPathSchema, updateLearningPathSchema } = require('./learning.path.schema');

// Progression endpoints
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
    const progress = await service.completePathWithAutoUnlock(userId, pathId);
    res.json({
      success: true,
      message: 'Parcours complété avec succès. Prochain parcours débloqué automatiquement.',
      data: progress
    });
  } catch (err) {
    next(err);
  }
};

async function getByUserId(req, res, next) {
	try {
		const paths = await service.getPathsByUserId(req.params.userId);
		// Retourner un tableau vide si aucun module sélectionné (comportement normal)
		res.json({ success: true, data: paths });
	} catch (err) {
		next(err);
	}
}

module.exports.getByUserId = getByUserId;

// Récupérer les parcours d'un module spécifique pour un utilisateur
async function getPathsByModuleId(req, res, next) {
	try {
		const { userId, moduleId } = req.params;
		const paths = await service.getPathsByModuleId(userId, moduleId);
		res.json({ success: true, data: paths });
	} catch (err) {
		next(err);
	}
}

module.exports.getPathsByModuleId = getPathsByModuleId;

// Helper to pick only allowed fields for Path creation
function pickPathFields(body) {
	return {
		moduleId: body.moduleId,
		title: body.title,
		description: body.description,
		index: body.index,
		estimatedMinutes: body.estimatedMinutes,
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
  create, getAll, getById, update, remove,
  getByUserId, getPathsByModuleId,
  startPath: exports.startPath,
  completePath: exports.completePath
};
