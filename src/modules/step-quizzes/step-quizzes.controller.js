const { createStepQuizSchema } = require('./step-quizzes.schema');
const service = require('./step-quizzes.service');

async function create(req, res, next) {
	try {
		const { error, value } = createStepQuizSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const quiz = await service.createStepQuiz(value);
		res.status(201).json({ success: true, data: quiz, message: 'Quiz créé avec succès.' });
	} catch (err) {
		next(err);
	}
}

async function getById(req, res, next) {
	try {
		const quiz = await service.getStepQuizById(req.params.id);
		if (!quiz) return res.status(404).json({ error: 'Quiz non trouvé' });
		res.json(quiz);
	} catch (err) {
		next(err);
	}
}

async function update(req, res, next) {
	try {
		const { error, value } = createStepQuizSchema.validate(req.body);
		if (error) return res.status(400).json({ error: error.details[0].message });
		const quiz = await service.updateStepQuiz(req.params.id, value);
		if (!quiz) return res.status(404).json({ error: 'Quiz non trouvé' });
		res.json(quiz);
	} catch (err) {
		next(err);
	}
}

async function remove(req, res, next) {
	try {
		const deleted = await service.deleteStepQuiz(req.params.id);
		if (!deleted) return res.status(404).json({ error: 'Quiz non trouvé' });
		res.status(204).send();
	} catch (err) {
		next(err);
	}
}

module.exports = { create, getById, update, remove };
