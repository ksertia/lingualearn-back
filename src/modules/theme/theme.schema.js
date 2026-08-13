const Joi = require('joi');

const createThemeSchema = Joi.object({
  moduleId:    Joi.string().required(),
  title:       Joi.string().max(200).required(),
  description: Joi.string().allow('', null).optional(),
  iconUrl:     Joi.string().uri().allow('', null).optional(),
  index:       Joi.number().integer().min(0).optional(),
});

const updateThemeSchema = Joi.object({
  title:       Joi.string().max(200),
  description: Joi.string().allow('', null),
  iconUrl:     Joi.string().uri().allow('', null),
  index:       Joi.number().integer().min(0),
  isActive:    Joi.boolean(),
});

module.exports = { createThemeSchema, updateThemeSchema };
