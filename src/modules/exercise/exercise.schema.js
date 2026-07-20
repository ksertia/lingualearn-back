const Joi = require('joi');

const createExerciseSchema = Joi.object({
	stepId:        Joi.string().required(),
	title:         Joi.string().max(200).required(),
	instructions:  Joi.string().required(),
	content:       Joi.object().required(),
	correctAnswers: Joi.object().allow(null),
	hints:         Joi.object().allow(null),
	explanation:   Joi.string().allow('', null),
	points:        Joi.number().integer().default(10),
	xpReward:      Joi.number().integer().default(20),
	coinReward:    Joi.number().integer().default(10),
	maxAttempts:   Joi.number().integer().default(3),
	index:         Joi.number().integer().default(0),
});

const updateExerciseSchema = Joi.object({
	title:         Joi.string().max(200),
	instructions:  Joi.string(),
	content:       Joi.object(),
	correctAnswers: Joi.object().allow(null),
	hints:         Joi.object().allow(null),
	explanation:   Joi.string().allow('', null),
	points:        Joi.number().integer(),
	xpReward:      Joi.number().integer(),
	coinReward:    Joi.number().integer(),
	maxAttempts:   Joi.number().integer(),
	index:         Joi.number().integer(),
});

module.exports = { createExerciseSchema, updateExerciseSchema };
