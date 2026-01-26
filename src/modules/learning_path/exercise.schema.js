const Joi = require('joi');

const createExerciseSchema = Joi.object({
  lessonId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  exerciseType: Joi.string().valid('multiple_choice', 'fill_blank', 'matching').required(),
  instructions: Joi.string().allow('', null),
  content: Joi.object().required(),
  correctAnswers: Joi.object().allow(null),
  hints: Joi.object().allow(null),
  explanation: Joi.string().allow('', null),
  points: Joi.number().integer().default(10),
  xpReward: Joi.number().integer().default(10),
  coinReward: Joi.number().integer().default(5),
  maxAttempts: Joi.number().integer().default(3),
  timeLimitSeconds: Joi.number().integer().allow(null),
  sortOrder: Joi.number().integer().allow(null),
  isActive: Joi.boolean().default(true)
});

module.exports = { createExerciseSchema };