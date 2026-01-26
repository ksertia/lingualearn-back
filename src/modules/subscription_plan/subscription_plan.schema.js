const Joi = require('joi');

const createSubscriptionPlanSchema = Joi.object({
  planCode: Joi.string().max(50).required(),
  planName: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  priceMonthly: Joi.number().precision(2).allow(null),
  priceYearly: Joi.number().precision(2).allow(null),
  currency: Joi.string().max(3).default('EUR'),
  features: Joi.object().required(),
  maxSubAccounts: Joi.number().integer().default(0),
  isActive: Joi.boolean().default(true)
});

module.exports = { createSubscriptionPlanSchema };
