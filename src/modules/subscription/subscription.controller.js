const service = require('./subscription.service');
const { createSubscriptionSchema } = require('./subscription.schema');

async function create(req, res, next) {
  try {
    const { error, value } = createSubscriptionSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const subscription = await service.createSubscription(value);
    res.status(201).json(subscription);
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const subscriptions = await service.getAllSubscriptions();
    res.json(subscriptions);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const subscription = await service.getSubscriptionById(req.params.id);
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    res.json(subscription);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { error, value } = createSubscriptionSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const subscription = await service.updateSubscription(req.params.id, value);
    res.json(subscription);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteSubscription(req.params.id);
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
