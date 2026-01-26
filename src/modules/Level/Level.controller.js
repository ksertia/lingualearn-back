const service = require('./level.service');
const { createLevelSchema, updateLevelSchema } = require('./level.schema');

async function create(req, res, next) {
	try {
		const { error, value } = createLevelSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const level = await service.createLevel({
			name: value.name,
			description: value.description,
			learningPathId: value.learningPathId
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

module.exports = {
	create,
	getAll,
	getById,
	update,
	remove
};
