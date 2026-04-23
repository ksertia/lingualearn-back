const service = require('./payment.service');
const Joi = require('joi');

const initiateSchema = Joi.object({
  userId:        Joi.string().required(),
  planId:        Joi.string().required(),
  billingCycle:  Joi.string().valid('monthly', 'yearly').default('monthly'),
  paymentMethod: Joi.string().valid('orange_money', 'moov_money', 'coris_money').required(),
  phoneNumber:   Joi.string().min(8).max(20).required(),
});

const confirmSchema = Joi.object({
  paymentRequestId: Joi.string().required(),
  otpCode:          Joi.string().length(6).required(),
});

async function initiate(req, res, next) {
  try {
    const { error, value } = initiateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const result = await service.initiatePayment(value);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function confirm(req, res, next) {
  try {
    const { error, value } = confirmSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const subscription = await service.confirmPayment(value);
    res.status(200).json({ message: 'Paiement confirmé. Abonnement activé.', subscription });
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const { userId } = req.params;
    const payments = await service.getPaymentHistory(userId);
    res.json(payments);
  } catch (err) {
    next(err);
  }
}

module.exports = { initiate, confirm, history };
