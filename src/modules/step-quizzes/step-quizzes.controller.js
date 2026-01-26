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

module.exports = { create };
