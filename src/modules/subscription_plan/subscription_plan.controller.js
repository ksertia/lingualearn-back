const service = require('./subscription_plan.service');
const { createSubscriptionPlanSchema } = require('./subscription_plan.schema');

async function create(req, res, next) {
  try {
    const { error, value } = createSubscriptionPlanSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const plan = await service.createSubscriptionPlan(value);
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const plans = await service.getAllSubscriptionPlans();
    res.json(plans);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const plan = await service.getSubscriptionPlanById(req.params.id);
    if (!plan) return res.status(404).json({ error: 'SubscriptionPlan not found' });
    res.json(plan);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { error, value } = createSubscriptionPlanSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const plan = await service.updateSubscriptionPlan(req.params.id, value);
    res.json(plan);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteSubscriptionPlan(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove
};
