const Joi = require('joi');

const createSubThemeSchema = Joi.object({
  themeId:     Joi.string().required(),
  title:       Joi.string().max(200).required(),
  description: Joi.string().allow('', null).optional(),
  index:       Joi.number().integer().min(0).optional(),
});

const updateSubThemeSchema = Joi.object({
  title:       Joi.string().max(200),
  description: Joi.string().allow('', null),
  index:       Joi.number().integer().min(0),
  isActive:    Joi.boolean(),
});

module.exports = { createSubThemeSchema, updateSubThemeSchema };
