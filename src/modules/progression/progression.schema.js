const Joi = require('joi');

const initializeProgressionSchema = Joi.object({
  userId: Joi.string().required(),
  languageId: Joi.string().required()
});

const completeStepSchema = Joi.object({
  userId: Joi.string().required(),
  stepId: Joi.string().required(),
  score: Joi.number().min(0).max(100).optional()
});

const completePathSchema = Joi.object({
  userId: Joi.string().required(),
  pathId: Joi.string().required(),
  quizScore: Joi.number().min(0).max(100).optional()
});

const completeModuleSchema = Joi.object({
  userId: Joi.string().required(),
  moduleId: Joi.string().required()
});

const completeLevelSchema = Joi.object({
  userId: Joi.string().required(),
  levelId: Joi.string().required()
});

const getUserProgressionSchema = Joi.object({
  userId: Joi.string().required(),
  languageId: Joi.string().required()
});

module.exports = {
  initializeProgressionSchema,
  completeStepSchema,
  completePathSchema,
  completeModuleSchema,
  completeLevelSchema,
  getUserProgressionSchema
};
