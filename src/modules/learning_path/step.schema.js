const Joi = require('joi');

const createStepSchema = Joi.object({
  title: Joi.string().max(200).required(),
  stepNumber: Joi.number().integer().required(),
  levelId: Joi.string().required()
});

const updateStepSchema = Joi.object({
  title: Joi.string().max(200),
  stepNumber: Joi.number().integer()
});

module.exports = {
  createStepSchema,
  updateStepSchema
};