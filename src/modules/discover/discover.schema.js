const Joi = require('joi');

// ==================== ROUTES PUBLIQUES (Utilisateurs non connectés) ====================

/**
 * Schéma pour récupérer les langues (GET /languages)
 */
exports.getLanguagesSchema = Joi.object({}).unknown(false);

/**
 * Schéma pour récupérer une leçon complète (GET /lesson)
 */
exports.getFullLessonSchema = Joi.object({
  languageCode: Joi.string()
    .required()
    .valid('mo166', 'Dl', 'fu768', 'fr211')
    .messages({
      'string.empty': 'Le code langue ne peut pas être vide',
      'any.required': 'Le paramètre languageCode est requis',
      'any.only': 'Code langue invalide'
    })
}).unknown(false);

/**
 * Schéma pour récupérer les exercices avec pagination (GET /exercises)
 */
exports.getExercisesSchema = Joi.object({
  languageCode: Joi.string()
    .required()
    .valid('mo166', 'Dl', 'fu768', 'fr211')
    .messages({
      'string.empty': 'Le code langue ne peut pas être vide',
      'any.required': 'Le paramètre languageCode est requis',
      'any.only': 'Code langue invalide'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Le numéro de page doit être un nombre',
      'number.min': 'Le numéro de page minimum est 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'La limite doit être un nombre',
      'number.min': 'La limite minimum est 1',
      'number.max': 'La limite maximum est 100'
    })
}).unknown(false);

/**
 * Schéma pour récupérer les exercices par section (GET /exercises/by-section)
 */
exports.getExercisesBySectionSchema = Joi.object({
  languageCode: Joi.string()
    .required()
    .valid('mo166', 'Dl', 'fu768', 'fr211')
    .messages({
      'any.required': 'Le paramètre languageCode est requis'
    }),
  section: Joi.string()
    .required()
    .valid('audio', 'video', 'qcm', 'dragdrop')
    .messages({
      'any.required': 'Le paramètre section est requis',
      'any.only': 'Section invalide. Valeurs acceptées: audio, video, qcm, dragdrop'
    }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
}).unknown(false);

/**
 * Schéma pour créer une session temporaire (POST /session/create)
 */
exports.createSessionSchema = Joi.object({}).unknown(false);

/**
 * Schéma pour récupérer le score d'une session (GET /session/:sessionId/score)
 */
exports.getSessionScoreSchema = Joi.object({
  sessionId: Joi.string()
    .required()
    .pattern(/^temp_/)
    .messages({
      'any.required': 'sessionId est requis',
      'string.pattern.base': 'Format sessionId invalide'
    })
}).unknown(false);

/**
 * Schéma pour soumettre une réponse (POST /exercises/:id/submit)
 */
exports.submitExerciseAnswerSchema = Joi.object({
  sessionId: Joi.string()
    .pattern(/^temp_/)
    .required()
    .messages({
      'any.required': 'sessionId est requis',
      'string.pattern.base': 'Format sessionId invalide'
    }),
  answers: Joi.object()
    .required()
    .messages({
      'any.required': 'Le champ answers est requis'
    })
}).unknown(false);

// ==================== ROUTES ADMIN ====================

/**
 * Schéma pour récupérer toutes les leçons (GET /admin/lessons)
 */
exports.getAllLessonsSchema = Joi.object({
  languageCode: Joi.string()
    .valid('mo166', 'Dl', 'fu768', 'fr211')
    .optional(),
  isPublished: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
}).unknown(false);

/**
 * Schéma pour créer une leçon (POST /admin/lesson/create)
 */
exports.createLessonSchema = Joi.object({
  title: Joi.string()
    .required()
    .min(3)
    .max(200)
    .messages({
      'any.required': 'Le titre est requis',
      'string.min': 'Le titre doit contenir au moins 3 caractères',
      'string.max': 'Le titre ne peut pas dépasser 200 caractères'
    }),
  description: Joi.string()
    .optional()
    .max(1000)
    .messages({
      'string.max': 'La description ne peut pas dépasser 1000 caractères'
    }),
  languageCode: Joi.string()
    .required()
    .valid('mo166', 'Dl', 'fu768', 'fr211')
    .messages({
      'any.required': 'Le code langue est requis',
      'any.only': 'Code langue invalide'
    }),
  level: Joi.string()
    .default('intermediate')
    .valid('beginner', 'intermediate', 'advanced')
    .messages({
      'any.only': 'Niveau invalide'
    }),
  sections: Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .required()
          .valid('audio', 'video', 'qcm', 'dragdrop')
          .messages({
            'any.required': 'Le type de section est requis',
            'any.only': 'Type de section invalide'
          }),
        title: Joi.string()
          .required()
          .min(3)
          .messages({
            'any.required': 'Le titre de la section est requis'
          }),
        exercises: Joi.array()
          .items(
            Joi.object({
              title: Joi.string().required(),
              mediaUrl: Joi.string().uri().optional(),
              text: Joi.string().optional(),
              translation: Joi.string().optional(),
              duration: Joi.number().optional(),
              description: Joi.string().optional(),
              question: Joi.string().optional(),
              choices: Joi.array().items(Joi.string()).optional(),
              correctAnswer: Joi.string().optional(),
              imageUrl: Joi.string().uri().optional(),
              imageAlt: Joi.string().optional(),
              dragItems: Joi.array().optional(),
              dropZones: Joi.array().optional(),
              hint: Joi.string().optional()
            })
          )
          .min(1)
          .required()
          .messages({
            'array.min': 'Chaque section doit avoir au moins un exercice'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'any.required': 'Au moins une section est requise',
      'array.min': 'Au moins une section est requise'
    })
}).unknown(false);

/**
 * Schéma pour mettre à jour une leçon (PUT /admin/lesson/:id)
 */
exports.updateLessonSchema = Joi.object({
  title: Joi.string()
    .optional()
    .min(3)
    .max(200),
  description: Joi.string()
    .optional()
    .max(1000),
  isPublished: Joi.boolean().optional(),
  sections: Joi.array()
    .items(Joi.object().unknown(true))
    .optional()
}).unknown(false);

/**
 * Schéma pour publier une leçon (PATCH /admin/lesson/:id/publish)
 */
exports.publishLessonSchema = Joi.object({
  isPublished: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Le champ isPublished est requis'
    })
}).unknown(false);
