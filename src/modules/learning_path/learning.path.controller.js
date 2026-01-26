const service = require('./learning.path.service');
const { createLearningPathSchema, updateLearningPathSchema } = require('./learning.path.schema');

async function create(req, res, next) {
	try {
		const { error, value } = createLearningPathSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		// On ne garde que title et description pour la création
		const path = await service.createLearningPath({
			title: value.title,
			description: value.description
		});
		res.status(201).json(path);
	} catch (err) {
		next(err);
	}
}

async function getAll(req, res, next) {
	try {
		const paths = await service.getAllLearningPaths();
		res.json(paths);
	} catch (err) {
		next(err);
	}
}

async function getById(req, res, next) {
	try {
		const path = await service.getLearningPathById(req.params.id);
		if (!path) return res.status(404).json({ error: 'LearningPath not found' });
		res.json(path);
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const { error, value } = updateLearningPathSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const path = await service.updateLearningPath(req.params.id, value);
		res.json(path);
	} catch (err) {
		next(err);
	}
}

async function remove(req, res, next) {
	try {
		await service.deleteLearningPath(req.params.id);
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
