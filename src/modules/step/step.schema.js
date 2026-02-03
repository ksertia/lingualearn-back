const Joi = require('joi');


// Validation pour la création d'une étape (alignée avec Prisma Step model)
const createStepSchema = Joi.object({
  pathId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow(null, ''),
  stepType: Joi.string().valid('lesson', 'exercise', 'quiz').required(),
  index: Joi.number().integer().min(0),
  estimatedMinutes: Joi.number().integer().min(1),
  isActive: Joi.boolean()
});

// Validation pour la mise à jour d'une étape (alignée avec Prisma Step model)
const updateStepSchema = Joi.object({
  pathId: Joi.string(),
  title: Joi.string().max(200),
  description: Joi.string().allow(null, ''),
  stepType: Joi.string().valid('lesson', 'exercise', 'quiz'),
  index: Joi.number().integer().min(0),
  estimatedMinutes: Joi.number().integer().min(1),
  isActive: Joi.boolean()
});

module.exports = {
  createStepSchema,
  updateStepSchema
};
