const Joi = require('joi');

/**
 * Règle commune : si contentType = 'text', content est du texte brut.
 * Sinon c'est une URL (retournée par POST /uploads/...).
 */
const contentField = (required = false) => Joi.when('contentType', {
  is: Joi.valid('video', 'audio', 'pdf', 'image'),
  then: required
    ? Joi.string().uri().required()
    : Joi.string().uri().allow('', null),
  otherwise: required
    ? Joi.string().required()
    : Joi.string().allow('', null)
});

const createCourseSchema = Joi.object({
  stepId:      Joi.string().required(),
  title:       Joi.string().max(200).required(),
  contentType: Joi.string().valid('text', 'video', 'audio', 'pdf', 'image').default('text'),
  content:     contentField(true),   // requis à la création
  attachments: Joi.array().items(Joi.object()).allow(null),
  duration:    Joi.number().integer().min(0).allow(null),
  isActive:    Joi.boolean().default(true)
});

const updateCourseSchema = Joi.object({
  title:       Joi.string().max(200),
  contentType: Joi.string().valid('text', 'video', 'audio', 'pdf', 'image'),
  content:     contentField(false),  // optionnel en update
  attachments: Joi.array().items(Joi.object()).allow(null),
  duration:    Joi.number().integer().min(0).allow(null),
  isActive:    Joi.boolean()
});

const patchCourseSchema = updateCourseSchema;

module.exports = { createCourseSchema, updateCourseSchema, patchCourseSchema };
