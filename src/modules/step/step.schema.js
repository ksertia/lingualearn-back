const Joi = require('joi');

// Validation pour la création d'une étape
const createStepSchema = Joi.object({
  levelId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow(null, ''),
  stepNumber: Joi.number().integer().required(),
  stepCode: Joi.string().max(50).allow(null, ''),
  thumbnailUrl: Joi.string().uri().allow(null, ''),
  iconUrl: Joi.string().uri().allow(null, ''),
  estimatedDurationHours: Joi.number().integer().min(1).default(1),
  difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
  isPublished: Joi.boolean().default(false),
  publishedAt: Joi.date().allow(null),
  sortOrder: Joi.number().integer(),
  isActive: Joi.boolean().default(true)
});

// Validation pour la mise à jour d'une étape
const updateStepSchema = Joi.object({
  title: Joi.string().max(200),
  description: Joi.string().allow(null, ''),
  stepNumber: Joi.number().integer(),
  stepCode: Joi.string().max(50).allow(null, ''),
  thumbnailUrl: Joi.string().uri().allow(null, ''),
  iconUrl: Joi.string().uri().allow(null, ''),
  estimatedDurationHours: Joi.number().integer().min(1),
  difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  isPublished: Joi.boolean(),
  publishedAt: Joi.date().allow(null),
  sortOrder: Joi.number().integer(),
  isActive: Joi.boolean()
});

module.exports = {
  createStepSchema,
  updateStepSchema
};
