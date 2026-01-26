const Joi = require('joi');

const createLevelSchema = Joi.object({
	name: Joi.string().max(100).required(),
	description: Joi.string().required(),
	learningPathId: Joi.string().required()
});

const updateLevelSchema = Joi.object({
	name: Joi.string().max(100),
	description: Joi.string(),
});

module.exports = {
	createLevelSchema,
	updateLevelSchema
};
