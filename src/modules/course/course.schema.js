const Joi = require('joi');

const SECTION_TYPES = ['introduction', 'main', 'transcript', 'example', 'example_audio', 'key_points'];
const CONTENT_TYPES = ['text', 'video', 'audio', 'pdf', 'image'];

// ─── Leçon (métadonnées) ───────────────────────────────────────────────────────
const createCourseSchema = Joi.object({
  stepId:  Joi.string().required(),
  title:   Joi.string().max(200).required(),
  summary: Joi.string().allow('', null).optional(),
});

const updateCourseSchema = Joi.object({
  title:    Joi.string().max(200),
  summary:  Joi.string().allow('', null),
  isActive: Joi.boolean(),
});

const patchCourseSchema = updateCourseSchema;

// ─── Bloc de contenu ───────────────────────────────────────────────────────────
const contentField = Joi.when('contentType', {
  is: Joi.valid('video', 'audio', 'pdf', 'image'),
  then: Joi.string().uri().required(),
  otherwise: Joi.string().required()   // text ou sectionType=transcript → texte brut
});

const createBlockSchema = Joi.object({
  sectionType: Joi.string().valid(...SECTION_TYPES).required(),
  contentType: Joi.string().valid(...CONTENT_TYPES).required(),
  content:     contentField,
  caption:     Joi.string().max(500).allow('', null).optional(),
  index:       Joi.number().integer().min(0).optional(),
});

const updateBlockSchema = Joi.object({
  sectionType: Joi.string().valid(...SECTION_TYPES),
  contentType: Joi.string().valid(...CONTENT_TYPES),
  content:     Joi.when('contentType', {
    is: Joi.valid('video', 'audio', 'pdf', 'image'),
    then: Joi.string().uri(),
    otherwise: Joi.string()
  }),
  caption:     Joi.string().max(500).allow('', null),
  index:       Joi.number().integer().min(0),
}).and('contentType', 'content').messages({
  'object.and': 'contentType et content doivent être fournis ensemble pour garantir la cohérence du bloc.'
});

const reorderBlocksSchema = Joi.object({
  orderedIds: Joi.array().items(Joi.string()).min(1).required(),
});

module.exports = {
  createCourseSchema, updateCourseSchema, patchCourseSchema,
  createBlockSchema, updateBlockSchema, reorderBlocksSchema,
  SECTION_TYPES, CONTENT_TYPES
};
