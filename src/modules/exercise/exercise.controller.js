const { createExerciseSchema, updateExerciseSchema } = require('./exercise.schema');
const service = require('./exercise.service');

async function create(req, res, next) {
	try {
		const { error, value } = createExerciseSchema.validate(req.body);
		if (error) return res.status(400).json({ success: false, error: error.details[0].message });
		const exercise = await service.createExercise(value);
		res.status(201).json({ success: true, data: exercise, message: 'Exercice créé avec succès.' });
	} catch (err) {
		next(err);
	}
}

async function getById(req, res, next) {
	try {
		const exercise = await service.getExerciseById(req.params.id);
		if (!exercise) return res.status(404).json({ success: false, error: 'Exercice non trouvé' });
		res.json({ success: true, data: exercise });
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const { error, value } = updateExerciseSchema.validate(req.body);
		if (error) return res.status(400).json({ success: false, error: error.details[0].message });
		const exercise = await service.updateExercise(req.params.id, value);
		if (!exercise) return res.status(404).json({ success: false, error: 'Exercice non trouvé' });
		res.json({ success: true, data: exercise });
	} catch (err) {
		next(err);
	}
}

async function remove(req, res, next) {
	try {
		await service.deleteExercise(req.params.id);
		res.status(200).json({ success: true, message: 'Exercice supprimé.' });
	} catch (err) {
		next(err);
	}
}

async function submitAnswer(req, res, next) {
	try {
		const { exerciseId } = req.params;
		const { userId, answers } = req.body;

		if (!userId || !answers) {
			return res.status(400).json({ success: false, error: 'userId et answers sont requis' });
		}

		const result = await service.submitExerciseAnswer(exerciseId, userId, answers);
		res.json({ success: true, data: result });
	} catch (err) {
		if (err.message?.includes('maximum de tentatives')) {
			return res.status(400).json({ success: false, error: err.message });
		}
		next(err);
	}
}

module.exports = { create, getById, update, remove, submitAnswer };
