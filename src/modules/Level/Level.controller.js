async function getByUserId(req, res, next) {
	try {
		const { languageId } = req.query;
		const levels = await service.getLevelsByUserId(req.params.userId, languageId || null);
		res.json({ success: true, data: levels });
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
	       const { languageId } = req.body;
	       console.log(`[2] selectLevel → userId: ${userId} | levelId: ${levelId} | languageId: ${languageId || 'non fourni'}`);

	       // Vérifier que le niveau appartient bien à la langue déclarée par le frontend
	       if (languageId) {
		       const { prisma } = require('../../config/prisma');
		       const level = await prisma.level.findUnique({ where: { id: levelId }, select: { languageId: true, name: true } });
		       if (level && level.languageId !== languageId) {
			       console.log(`[2] ERREUR → niveau "${level.name}" appartient à ${level.languageId}, pas à ${languageId}`);
			       return res.status(400).json({ success: false, error: `Le niveau "${level.name}" n'appartient pas à cette langue` });
		       }
	       }

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

// Activer un niveau
async function activateLevel(req, res, next) {
  try {
    const { id } = req.params; // ID du niveau
    const level = await service.activateLevel(id);
    res.json({
      success: true,
      message: 'Niveau activé avec succès',
      data: level
    });
  } catch (err) {
    next(err);
  }
}

// Désactiver un niveau
async function deactivateLevel(req, res, next) {
  try {
    const { id } = req.params; // ID du niveau
    const level = await service.deactivateLevel(id);
    res.json({
      success: true,
      message: 'Niveau désactivé avec succès',
      data: level
    });
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
	selectLevel: exports.selectLevel,
	startLevel: exports.startLevel,
	completeLevel: exports.completeLevel,
	activateLevel,
	deactivateLevel
};