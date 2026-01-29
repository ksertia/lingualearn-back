const Joi = require('joi');


const createLevelSchema = Joi.object({
	languageId: Joi.string().required(),
	code: Joi.string().max(20).required(),
	name: Joi.string().max(100).required(),
	description: Joi.string().allow('', null),
	index: Joi.number().integer().min(0).default(0),
	isActive: Joi.boolean().default(true)
});


const updateLevelSchema = Joi.object({
	code: Joi.string().max(20),
	name: Joi.string().max(100),
	description: Joi.string().allow('', null),
	index: Joi.number().integer().min(0),
	isActive: Joi.boolean()
});

module.exports = {
	createLevelSchema,
	updateLevelSchema
};