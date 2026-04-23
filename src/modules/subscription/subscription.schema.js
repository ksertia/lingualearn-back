const Joi = require('joi');

const createSubscriptionSchema = Joi.object({
  userId:             Joi.string().required(),
  planId:             Joi.string().required(),
  status:             Joi.string().valid('active', 'canceled', 'pending').default('active'),
  billingCycle:       Joi.string().valid('monthly', 'yearly').default('monthly'),
  currentPeriodStart: Joi.date().default(() => new Date()),
  // currentPeriodEnd est calculé automatiquement à partir de billingCycle
  cancelAtPeriodEnd:  Joi.boolean().default(false),
});

const updateSubscriptionSchema = Joi.object({
  planId:             Joi.string(),
  status:             Joi.string().valid('active', 'canceled', 'pending'),
  billingCycle:       Joi.string().valid('monthly', 'yearly'),
  currentPeriodStart: Joi.date(),
  currentPeriodEnd:   Joi.date(),
  cancelAtPeriodEnd:  Joi.boolean(),
  canceledAt:         Joi.date().allow(null),
});

module.exports = { createSubscriptionSchema, updateSubscriptionSchema };
