const Joi = require('joi');

const createStepQuizSchema = Joi.object({
  stepId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  questions: Joi.array().items(Joi.object()).required(),
  passingScore: Joi.number().integer().default(70),
  maxAttempts: Joi.number().integer().default(3),
  timeLimitMinutes: Joi.number().integer().default(20),
  xpReward: Joi.number().integer().default(80),
  coinReward: Joi.number().integer().default(40),
  isActive: Joi.boolean().default(true)
});

module.exports = { createStepQuizSchema };