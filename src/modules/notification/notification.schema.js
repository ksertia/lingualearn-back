const Joi = require('joi');
const { mediaUrl } = require('../../utils/validators');

const createNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  title: Joi.string().max(200).required(),
  message: Joi.string().required(),
  notificationType: Joi.string().max(30).default('info'),
  iconUrl: mediaUrl().allow(null, ''),
  actionUrl: mediaUrl().allow(null, ''),
  isRead: Joi.boolean().default(false)
});

module.exports = { createNotificationSchema };
