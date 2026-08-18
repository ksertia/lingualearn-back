const Joi = require('joi');

const CONTENT_TYPES = ['course', 'video', 'exercise', 'resource'];
const SECTION_TYPES = ['introduction', 'lesson', 'example', 'key_point', 'summary'];
const BLOCK_TYPES = ['text', 'video', 'audio', 'pdf', 'image'];
const RESOURCE_TYPES = ['pdf', 'link', 'file'];

// ─── Contenu (polymorphe selon contentType) ────────────────────────────────────
const createContentSchema = Joi.object({
  subThemeId:  Joi.string().required(),
  contentType: Joi.string().valid(...CONTENT_TYPES).required(),
  title:       Joi.string().max(200).required(),
  index:       Joi.number().integer().min(0).optional(),

  // course
  summary: Joi.when('contentType', { is: 'course', then: Joi.string().allow('', null).optional(), otherwise: Joi.forbidden() }),

  // video
  videoUrl:    Joi.when('contentType', { is: 'video', then: Joi.string().uri().required(), otherwise: Joi.forbidden() }),
  description: Joi.when('contentType', { is: 'video', then: Joi.string().allow('', null).optional(), otherwise: Joi.forbidden() }),
  keyPoints:   Joi.when('contentType', { is: 'video', then: Joi.array().items(Joi.string()).optional(), otherwise: Joi.forbidden() }),

  // exercise
  statement:       Joi.when('contentType', { is: 'exercise', then: Joi.string().required(), otherwise: Joi.forbidden() }),
  question:        Joi.when('contentType', { is: 'exercise', then: Joi.string().required(), otherwise: Joi.forbidden() }),
  possibleAnswers: Joi.when('contentType', { is: 'exercise', then: Joi.array().items(Joi.string()).optional(), otherwise: Joi.forbidden() }),
  correctAnswer:   Joi.when('contentType', { is: 'exercise', then: Joi.alternatives(Joi.string(), Joi.array()).required(), otherwise: Joi.forbidden() }),
  explanation:     Joi.when('contentType', { is: 'exercise', then: Joi.string().allow('', null).optional(), otherwise: Joi.forbidden() }),

  // resource
  resourceType: Joi.when('contentType', { is: 'resource', then: Joi.string().valid(...RESOURCE_TYPES).required(), otherwise: Joi.forbidden() }),
  resourceUrl:  Joi.when('contentType', { is: 'resource', then: Joi.string().uri().required(), otherwise: Joi.forbidden() }),
});

const updateContentSchema = Joi.object({
  title:    Joi.string().max(200),
  index:    Joi.number().integer().min(0),
  isActive: Joi.boolean(),

  summary: Joi.string().allow('', null),

  videoUrl:    Joi.string().uri(),
  description: Joi.string().allow('', null),
  keyPoints:   Joi.array().items(Joi.string()),

  statement:       Joi.string(),
  question:        Joi.string(),
  possibleAnswers: Joi.array().items(Joi.string()),
  correctAnswer:   Joi.alternatives(Joi.string(), Joi.array()),
  explanation:     Joi.string().allow('', null),

  resourceType: Joi.string().valid(...RESOURCE_TYPES),
  resourceUrl:  Joi.string().uri(),
});

// ─── Bloc de contenu (contentType = course uniquement) ─────────────────────────
const blockContentField = Joi.when('blockType', {
  is: Joi.valid('video', 'audio', 'pdf', 'image'),
  then: Joi.string().uri().required(),
  otherwise: Joi.string().required()
});

const createBlockSchema = Joi.object({
  sectionType: Joi.string().valid(...SECTION_TYPES).required(),
  blockType:   Joi.string().valid(...BLOCK_TYPES).required(),
  content:     blockContentField,
  caption:     Joi.string().max(500).allow('', null).optional(),
  index:       Joi.number().integer().min(0).optional(),
});

const updateBlockSchema = Joi.object({
  sectionType: Joi.string().valid(...SECTION_TYPES),
  blockType:   Joi.string().valid(...BLOCK_TYPES),
  content:     Joi.when('blockType', {
    is: Joi.valid('video', 'audio', 'pdf', 'image'),
    then: Joi.string().uri(),
    otherwise: Joi.string()
  }),
  caption:     Joi.string().max(500).allow('', null),
  index:       Joi.number().integer().min(0),
}).and('blockType', 'content').messages({
  'object.and': 'blockType et content doivent être fournis ensemble pour garantir la cohérence du bloc.'
});

const reorderBlocksSchema = Joi.object({
  orderedIds: Joi.array().items(Joi.string()).min(1).required(),
});

// ─── Soumission d'exercice ──────────────────────────────────────────────────────
const submitExerciseSchema = Joi.object({
  userId: Joi.string().required(),
  answer: Joi.alternatives(Joi.string(), Joi.array()).required(),
});

// ─── Complétion (course / video / resource) ────────────────────────────────────
const completeContentSchema = Joi.object({
  userId: Joi.string().required(),
});

module.exports = {
  createContentSchema, updateContentSchema,
  createBlockSchema, updateBlockSchema, reorderBlocksSchema,
  submitExerciseSchema, completeContentSchema,
  CONTENT_TYPES, SECTION_TYPES, BLOCK_TYPES, RESOURCE_TYPES
};
