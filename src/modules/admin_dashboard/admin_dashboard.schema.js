const Joi = require('joi');


const dashboardFilterSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  userType: Joi.string().valid('admin', 'user', 'sub_account').optional(),
  isActive: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional(),
  withSubscription: Joi.boolean().optional(),
});

module.exports = { dashboardFilterSchema };
