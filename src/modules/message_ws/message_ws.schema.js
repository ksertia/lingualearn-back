const Joi = require('joi');

const createMessageSchema = Joi.object({
  senderId: Joi.string().required(),
  recipientId: Joi.string().required(),
  content: Joi.string().required(),
  type: Joi.string().valid('text', 'image', 'file').default('text'),
  metadata: Joi.object().allow(null)
});

module.exports = { createMessageSchema };
