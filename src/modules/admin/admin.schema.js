const Joi = require('joi');

// ============================================================================
// COURSE SCHEMAS
// ============================================================================

const createCourseSchema = Joi.object({
  trackId: Joi.string().required().messages({
    'string.empty': 'Track ID is required',
    'any.required': 'Track ID is required',
  }),
  
  courseNumber: Joi.number().integer().min(1).required().messages({
    'number.base': 'Course number must be a number',
    'number.min': 'Course number must be at least 1',
    'any.required': 'Course number is required',
  }),
  
  title: Joi.string().min(3).max(200).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters',
    'string.max': 'Title must not exceed 200 characters',
    'any.required': 'Title is required',
  }),
  
  description: Joi.string().allow('', null).optional(),
  
  thumbnailUrl: Joi.string().uri().allow('', null).optional().messages({
    'string.uri': 'Thumbnail URL must be a valid URL',
  }),
  
  videoPreviewUrl: Joi.string().uri().allow('', null).optional().messages({
    'string.uri': 'Video preview URL must be a valid URL',
  }),
  
  estimatedDurationMinutes: Joi.number().integer().min(1).default(60).messages({
    'number.base': 'Estimated duration must be a number',
    'number.min': 'Estimated duration must be at least 1 minute',
  }),
  
  difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner').messages({
    'any.only': 'Difficulty level must be beginner, intermediate, or advanced',
  }),
  
  isPublished: Joi.boolean().default(false),
});

const updateCourseSchema = Joi.object({
  trackId: Joi.string().optional(),
  courseNumber: Joi.number().integer().min(1).optional(),
  title: Joi.string().min(3).max(200).optional(),
  description: Joi.string().allow('', null).optional(),
  thumbnailUrl: Joi.string().uri().allow('', null).optional(),
  videoPreviewUrl: Joi.string().uri().allow('', null).optional(),
  estimatedDurationMinutes: Joi.number().integer().min(1).optional(),
  difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  isPublished: Joi.boolean().optional(),
  sortOrder: Joi.number().integer().optional(),
}).min(1); // Au moins un champ doit être fourni

// ============================================================================
// USER SCHEMAS
// ============================================================================

const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).max(100).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must not exceed 100 characters',
    'any.required': 'New password is required',
  }),
});

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

const schemas = {
  createCourse: createCourseSchema,
  updateCourse: updateCourseSchema,
  resetPassword: resetPasswordSchema,
};

/**
 * Middleware de validation
 * @param {string} schemaName - Nom du schema à utiliser
 */
const validateRequest = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return res.status(500).json({
        success: false,
        message: `Validation schema '${schemaName}' not found`,
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Retourner toutes les erreurs
      stripUnknown: true, // Retirer les champs non définis
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    // Remplacer req.body par les valeurs validées
    req.body = value;
    next();
  };
};

module.exports = {
  createCourseSchema,
  updateCourseSchema,
  resetPasswordSchema,
  validateRequest,
};