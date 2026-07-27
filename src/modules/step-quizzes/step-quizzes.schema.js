const Joi = require('joi');

const createStepQuizSchema = Joi.object({
	stepId: Joi.string().required(),
	title: Joi.string().max(200).required(),
	description: Joi.string().allow('', null),
	questions: Joi.array().items(Joi.object()).min(1).required(),
	passingScore: Joi.number().integer().min(0).max(100).default(70),
	maxAttempts: Joi.number().integer().min(1).default(3),
	timeLimitMinutes: Joi.number().integer().min(1).default(20),
	xpReward: Joi.number().integer().min(0).default(80),
	coinReward: Joi.number().integer().min(0).default(40),
	isActive: Joi.boolean().default(true)
});

const updateStepQuizSchema = Joi.object({
	title: Joi.string().max(200),
	description: Joi.string().allow('', null),
	questions: Joi.array().items(Joi.object()).min(1),
	passingScore: Joi.number().integer().min(0).max(100),
	maxAttempts: Joi.number().integer().min(1),
	timeLimitMinutes: Joi.number().integer().min(1),
	xpReward: Joi.number().integer().min(0),
	coinReward: Joi.number().integer().min(0),
	isActive: Joi.boolean()
});

module.exports = { createStepQuizSchema, updateStepQuizSchema };
