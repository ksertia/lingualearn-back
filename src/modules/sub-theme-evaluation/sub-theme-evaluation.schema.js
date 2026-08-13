const Joi = require('joi');

const createEvaluationSchema = Joi.object({
  subThemeId:       Joi.string().required(),
  title:            Joi.string().max(200).required(),
  description:      Joi.string().allow('', null).optional(),
  questions:        Joi.array().items(Joi.object()).min(1).required(),
  passingScore:     Joi.number().integer().min(0).max(100).default(70),
  maxAttempts:      Joi.number().integer().min(1).default(3),
  timeLimitMinutes: Joi.number().integer().min(1).default(15),
});

const updateEvaluationSchema = Joi.object({
  title:            Joi.string().max(200),
  description:      Joi.string().allow('', null),
  questions:        Joi.array().items(Joi.object()).min(1),
  passingScore:     Joi.number().integer().min(0).max(100),
  maxAttempts:      Joi.number().integer().min(1),
  timeLimitMinutes: Joi.number().integer().min(1),
  isActive:         Joi.boolean(),
});

const submitEvaluationSchema = Joi.object({
  userId:  Joi.string().required(),
  answers: Joi.object().required(),
});

module.exports = { createEvaluationSchema, updateEvaluationSchema, submitEvaluationSchema };
