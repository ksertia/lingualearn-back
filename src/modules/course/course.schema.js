const Joi = require('joi');

const createCourseSchema = Joi.object({
  stepId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  contentType: Joi.string().valid('video', 'audio', 'text', 'pdf', 'image').default('text'),
  // text → description requis, contentUrl ignoré
  // video/audio/pdf/image → contentUrl requis, description optionnel
  description: Joi.when('contentType', {
    is: 'text',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('', null)
  }),
  contentUrl: Joi.when('contentType', {
    is: 'text',
    then: Joi.string().allow('', null),
    otherwise: Joi.string().uri().allow('', null)
  }),
  contentFilename: Joi.string().allow('', null),
  thumbnailUrl: Joi.string().uri().allow('', null),
  thumbnailFilename: Joi.string().allow('', null),
  duration: Joi.number().integer().min(0),
  order: Joi.number().integer().default(1),
  isPublished: Joi.boolean().default(false),
  publishedAt: Joi.date().allow(null),
  isActive: Joi.boolean().default(true)
});

const updateCourseSchema = Joi.object({
  title: Joi.string().max(200),
  contentType: Joi.string().valid('video', 'audio', 'text', 'pdf', 'image'),
  description: Joi.when('contentType', {
    is: 'text',
    then: Joi.string().allow('', null),
    otherwise: Joi.string().allow('', null)
  }),
  contentUrl: Joi.when('contentType', {
    is: 'text',
    then: Joi.string().allow('', null),
    otherwise: Joi.string().uri().allow('', null)
  }),
  contentFilename: Joi.string().allow('', null),
  thumbnailUrl: Joi.string().uri().allow('', null),
  thumbnailFilename: Joi.string().allow('', null),
  duration: Joi.number().integer().min(0),
  order: Joi.number().integer(),
  isPublished: Joi.boolean(),
  publishedAt: Joi.date().allow(null),
  isActive: Joi.boolean()
});

const patchCourseSchema = updateCourseSchema;

module.exports = {
  createCourseSchema,
  updateCourseSchema,
  patchCourseSchema
};
