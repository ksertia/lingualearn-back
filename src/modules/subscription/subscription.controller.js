const service = require('./subscription.service');
const { createSubscriptionSchema, updateSubscriptionSchema } = require('./subscription.schema');

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
    const { error, value } = updateSubscriptionSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const subscription = await service.updateSubscription(req.params.id, value);
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    res.json(subscription);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await service.deleteSubscription(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Subscription not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function myStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const status = await service.getMyStatus(userId);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getAll, getById, myStatus, update, remove };
