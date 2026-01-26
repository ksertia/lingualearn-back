const Joi = require('joi');

const createNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  message: Joi.string().required(),
  notificationType: Joi.string().max(30).default('info'),
  iconUrl: Joi.string().uri().allow(null, ''),
  actionUrl: Joi.string().uri().allow(null, ''),
  isRead: Joi.boolean().default(false)
});

module.exports = { createNotificationSchema };
