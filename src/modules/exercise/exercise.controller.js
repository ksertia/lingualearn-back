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

module.exports = { create };
