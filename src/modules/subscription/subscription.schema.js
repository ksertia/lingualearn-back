const Joi = require('joi');

const createSubscriptionSchema = Joi.object({
  userId: Joi.string().required(),
  planId: Joi.string().required(),
  status: Joi.string().valid('active', 'canceled', 'pending').default('active'),
  billingCycle: Joi.string().valid('monthly', 'yearly').default('monthly'),
  currentPeriodStart: Joi.date().required(),
  currentPeriodEnd: Joi.date().required(),
  cancelAtPeriodEnd: Joi.boolean().default(false),
  canceledAt: Joi.date().allow(null)
});

module.exports = { createSubscriptionSchema };
