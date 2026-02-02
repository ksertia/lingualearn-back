const Joi = require('joi');

exports.submitEvaluationSchema = Joi.object({
  languageId: Joi.string().required(),
  userId: Joi.string().allow(null, ''), // optionnel pour découverte
  score: Joi.number().min(0).max(100).required(),
  feedback: Joi.string().allow('', null),
  details: Joi.object().optional() // Pour stocker des infos additionnelles (questions, réponses, etc.)
});
