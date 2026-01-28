const { createExerciseSchema } = require('./exercise.schema');
const service = require('./exercise.service');

async function create(req, res, next) {
	try {
		const { error, value } = createExerciseSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const exercise = await service.createExercise(value);
		res.status(201).json({ success: true, data: exercise, message: 'Exercice créé avec succès.' });
	} catch (err) {
		next(err);
	}
}

async function getById(req, res, next) {
	try {
		const exercise = await service.getExerciseById(req.params.id);
		if (!exercise) return res.status(404).json({ error: 'Exercice non trouvé' });
		res.json(exercise);
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const { error, value } = createExerciseSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const exercise = await service.updateExercise(req.params.id, value);
		if (!exercise) return res.status(404).json({ error: 'Exercice non trouvé' });
		res.json(exercise);
	} catch (err) {
		next(err);
	}
}

async function remove(req, res, next) {
	try {
		const deleted = await service.deleteExercise(req.params.id);
		if (!deleted) return res.status(404).json({ error: 'Exercice non trouvé' });
		res.status(204).send();
	} catch (err) {
		next(err);
	}
}

module.exports = { create, getById, update, remove };
