const Joi = require('joi');

exports.createLanguageSchema = Joi.object({
	code: Joi.string().max(10).required(),
	name: Joi.string().max(100).required(),
	description: Joi.string().allow('', null),
	iconUrl: Joi.string().uri().allow('', null),
	isActive: Joi.boolean().default(true),
	index: Joi.number().integer().min(0).default(0)
});

exports.updateLanguageSchema = Joi.object({
	code: Joi.string().max(10),
	name: Joi.string().max(100),
	description: Joi.string().allow('', null),
	iconUrl: Joi.string().uri().allow('', null),
	isActive: Joi.boolean(),
	index: Joi.number().integer().min(0)
});
