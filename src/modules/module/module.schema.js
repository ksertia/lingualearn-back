const Joi = require('joi');
const { mediaUrl } = require('../../utils/validators');

exports.createModuleSchema = Joi.object({
  levelId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  iconUrl: mediaUrl().allow('', null),
  index: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true)
});

exports.updateModuleSchema = Joi.object({
  title: Joi.string().max(200),
  description: Joi.string().allow('', null),
  iconUrl: mediaUrl().allow('', null),
  index: Joi.number().integer().min(0),
  isActive: Joi.boolean()
});
