const Joi = require('joi');

const createLearningPathSchema = Joi.object({
	title: Joi.string().max(200).required(),
	description: Joi.string().required()
});

const updateLearningPathSchema = Joi.object({
	title: Joi.string().max(200),
	description: Joi.string().allow(null, ''),
	code: Joi.string().max(50),
	thumbnailUrl: Joi.string().uri().allow(null, ''),
	bannerUrl: Joi.string().uri().allow(null, ''),
	colorCode: Joi.string().max(7).allow(null, ''),
	iconUrl: Joi.string().uri().allow(null, ''),
	estimatedDurationWeeks: Joi.number().integer().min(1).allow(null),
	isPublished: Joi.boolean(),
	sortOrder: Joi.number().integer(),
	isActive: Joi.boolean()
});

module.exports = {
	createLearningPathSchema,
	updateLearningPathSchema
};
