const Joi = require('joi');

const tryDemoSchema = Joi.object({
  answer: Joi.alternatives(Joi.string(), Joi.array()).required(),
});

module.exports = { tryDemoSchema };
