const Joi = require('joi');
const { mediaUrl } = require('../../utils/validators');

const createThemeSchema = Joi.object({
  moduleId:    Joi.string().required(),
  title:       Joi.string().max(200).required(),
  description: Joi.string().allow('', null).optional(),
  iconUrl:     mediaUrl().allow('', null).optional(),
  index:       Joi.number().integer().min(0).optional(),
});

const updateThemeSchema = Joi.object({
  title:       Joi.string().max(200),
  description: Joi.string().allow('', null),
  iconUrl:     mediaUrl().allow('', null),
  index:       Joi.number().integer().min(0),
  isActive:    Joi.boolean(),
});

module.exports = { createThemeSchema, updateThemeSchema };
