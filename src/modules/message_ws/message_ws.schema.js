const Joi = require('joi');

// senderId retiré : il est injecté depuis req.user.id dans le controller
const createMessageSchema = Joi.object({
  recipientId: Joi.string().required(),
  content: Joi.string().min(1).max(5000).required(),
  type: Joi.string().valid('text', 'image', 'file').default('text'),
  metadata: Joi.object().allow(null),
});

module.exports = { createMessageSchema };
