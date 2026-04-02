const Joi = require('joi');

const createCourseSchema = Joi.object({
  stepId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  description: Joi.string().allow('', null),
  contentType: Joi.string().valid('video', 'audio', 'text', 'pdf', 'image').default('video'),
  // contentUrl accepte soit une URL valide, soit une chaîne vide (fichier uploadé utilisera contentFilename)
  contentUrl: Joi.string().uri().allow('', null),
  // Nouveau champ pour le nom de fichier uploadé
  contentFilename: Joi.string().allow('', null),
  thumbnailUrl: Joi.string().uri().allow('', null),
  // Nouveau champ pour la vignette uploadée
  thumbnailFilename: Joi.string().allow('', null),
  duration: Joi.number().integer().min(0),
  order: Joi.number().integer().default(1),
  isPublished: Joi.boolean().default(false),
  publishedAt: Joi.date().allow(null),
  isActive: Joi.boolean().default(true)
});

const updateCourseSchema = Joi.object({
  title: Joi.string().max(200),
  description: Joi.string().allow('', null),
  contentType: Joi.string().valid('video', 'audio', 'text', 'pdf', 'image'),
  contentUrl: Joi.string().uri().allow('', null),
  contentFilename: Joi.string().allow('', null),
  thumbnailUrl: Joi.string().uri().allow('', null),
  thumbnailFilename: Joi.string().allow('', null),
  duration: Joi.number().integer().min(0),
  order: Joi.number().integer(),
  isPublished: Joi.boolean(),
  publishedAt: Joi.date().allow(null),
  isActive: Joi.boolean()
});

const patchCourseSchema = Joi.object({
  title: Joi.string().max(200),
  description: Joi.string().allow('', null),
  contentType: Joi.string().valid('video', 'audio', 'text', 'pdf', 'image'),
  contentUrl: Joi.string().uri().allow('', null),
  contentFilename: Joi.string().allow('', null),
  thumbnailUrl: Joi.string().uri().allow('', null),
  thumbnailFilename: Joi.string().allow('', null),
  duration: Joi.number().integer().min(0),
  order: Joi.number().integer(),
  isPublished: Joi.boolean(),
  publishedAt: Joi.date().allow(null),
  isActive: Joi.boolean()
});

module.exports = {
  createCourseSchema,
  updateCourseSchema,
  patchCourseSchema
};
