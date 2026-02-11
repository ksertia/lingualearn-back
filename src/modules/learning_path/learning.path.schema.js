const Joi = require('joi');


const createLearningPathSchema = Joi.object({
	moduleId: Joi.string().required(),
	title: Joi.string().max(200).required(),
	description: Joi.string().allow(null, ''),
	index: Joi.number().integer().min(0).allow(null).optional(),
	tempResaListime: Joi.number().integer().allow(null),
	thumbnailUrl: Joi.string().uri().allow(null, ''),
	difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
	estimatedHours: Joi.number().integer().min(0).allow(null),
	isActive: Joi.boolean()
});

const updateLearningPathSchema = Joi.object({
	moduleId: Joi.string(),
	title: Joi.string().max(200),
	description: Joi.string().allow(null, ''),
	index: Joi.number().integer().min(0).allow(null).optional(),
	tempResaListime: Joi.number().integer().allow(null),
	thumbnailUrl: Joi.string().uri().allow(null, ''),
	difficulty: Joi.string().valid('easy', 'medium', 'hard'),
	estimatedHours: Joi.number().integer().min(0).allow(null),
	isActive: Joi.boolean()
});

module.exports = {
	createLearningPathSchema,
	updateLearningPathSchema
};
