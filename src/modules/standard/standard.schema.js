const Joi = require('joi');
const { mediaUrl } = require('../../utils/validators');

const itemSchema = Joi.object({
	type: Joi.string().valid('vocabulary', 'phrase', 'quiz', 'translate').required(),
	term: Joi.string().max(255).allow('', null),
	translation: Joi.string().max(255).allow('', null),
	example: Joi.string().max(500).allow('', null),
	exampleTranslation: Joi.string().max(500).allow('', null),
	audioUrl: mediaUrl().allow('', null),
	question: Joi.string().max(500).allow('', null),
	options: Joi.array().items(Joi.string()).min(3).max(4),
	answerIndex: Joi.number().integer().min(0),
	sentence: Joi.string().max(500).allow('', null),
	answerWords: Joi.array().items(Joi.string()).min(1),
	distractors: Joi.array().items(Joi.string()).min(2).max(4),
	fromFrench: Joi.boolean()
}).custom((value, helpers) => {
	if (value.type === 'vocabulary' || value.type === 'phrase') {
		if (!value.term || !value.translation) {
			return helpers.message('"term" et "translation" sont requis pour un item vocabulary/phrase');
		}
	}
	if (value.type === 'quiz') {
		if (!value.question || !Array.isArray(value.options) || value.options.length < 3) {
			return helpers.message('"question" et au moins 3 "options" sont requis pour un item quiz');
		}
		if (value.answerIndex === undefined || value.answerIndex < 0 || value.answerIndex > value.options.length - 1) {
			return helpers.message('"answerIndex" doit être compris entre 0 et options.length - 1');
		}
	}
	if (value.type === 'translate') {
		if (!value.sentence || !Array.isArray(value.answerWords) || value.answerWords.length < 1) {
			return helpers.message('"sentence" et "answerWords" sont requis pour un item translate');
		}
		if (!Array.isArray(value.distractors) || value.distractors.length < 2) {
			return helpers.message('"distractors" (au moins 2) est requis pour un item translate');
		}
		if (value.fromFrench === undefined) {
			return helpers.message('"fromFrench" est requis pour un item translate');
		}
	}
	return value;
}, 'Validation par type d\'item');

exports.upsertSessionSchema = Joi.object({
	languageId: Joi.string().required(),
	position: Joi.number().integer().min(1).required(),
	title: Joi.string().max(200).required(),
	estimatedMinutes: Joi.number().integer().min(1).max(30).default(3),
	items: Joi.array().items(itemSchema).min(1).required()
});

exports.completeSessionSchema = Joi.object({
	userId: Joi.string().required(),
	languageId: Joi.string().required(),
	correctAnswers: Joi.number().integer().min(0).required(),
	exerciseCount: Joi.number().integer().min(0).required(),
	durationSeconds: Joi.number().integer().min(0).required(),
	requestId: Joi.string().max(100).required()
}).custom((value, helpers) => {
	if (value.correctAnswers > value.exerciseCount) {
		return helpers.message('"correctAnswers" ne peut pas dépasser "exerciseCount"');
	}
	return value;
}, 'correctAnswers <= exerciseCount');

exports.reorderSchema = Joi.object({
	order: Joi.array().items(Joi.string()).min(1).required()
});
