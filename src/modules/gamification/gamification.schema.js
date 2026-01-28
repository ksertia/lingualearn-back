const Joi = require('joi');

const createBadgeSchema = Joi.object({
  badgeCode: Joi.string().max(50).required(),
  badgeName: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  category: Joi.string().allow('', null),
  iconUrl: Joi.string().uri().allow(null, ''),
  colorCode: Joi.string().max(7).allow(null, ''),
  isActive: Joi.boolean().default(true)
});

const createUserBadgeSchema = Joi.object({
  userId: Joi.string().required(),
  badgeId: Joi.string().required(),
  awardedAt: Joi.date().default(new Date())
});

module.exports = { createBadgeSchema, createUserBadgeSchema };
