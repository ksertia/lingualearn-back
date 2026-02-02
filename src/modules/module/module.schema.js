const Joi = require('joi');

exports.createModuleSchema = Joi.object({
  levelId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  iconUrl: Joi.string().uri().allow('', null),
  index: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

exports.updateModuleSchema = Joi.object({
  title: Joi.string().max(200),
  description: Joi.string().allow('', null),
  iconUrl: Joi.string().uri().allow('', null),
  index: Joi.number().integer().min(0),
  isActive: Joi.boolean()
});
