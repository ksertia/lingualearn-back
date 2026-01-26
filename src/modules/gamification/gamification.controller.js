const service = require('./gamification.service');
const { createBadgeSchema, createUserBadgeSchema } = require('./gamification.schema');

// Badges
async function createBadge(req, res, next) {
  try {
    const { error, value } = createBadgeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const badge = await service.createBadge(value);
    res.status(201).json(badge);
  } catch (err) {
    next(err);
  }
}
async function getAllBadges(req, res, next) {
  try {
    const badges = await service.getAllBadges();
    res.json(badges);
  } catch (err) {
    next(err);
  }
}
async function getBadgeById(req, res, next) {
  try {
    const badge = await service.getBadgeById(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge not found' });
    res.json(badge);
  } catch (err) {
    next(err);
  }
}
async function updateBadge(req, res, next) {
  try {
    const { error, value } = createBadgeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const badge = await service.updateBadge(req.params.id, value);
    res.json(badge);
  } catch (err) {
    next(err);
  }
}
async function deleteBadge(req, res, next) {
  try {
    await service.deleteBadge(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
// UserBadges
async function awardBadgeToUser(req, res, next) {
  try {
    const { error, value } = createUserBadgeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const userBadge = await service.awardBadgeToUser(value);
    res.status(201).json(userBadge);
  } catch (err) {
    next(err);
  }
}
async function getUserBadges(req, res, next) {
  try {
    const userBadges = await service.getUserBadges(req.params.userId);
    res.json(userBadges);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBadge,
  getAllBadges,
  getBadgeById,
  updateBadge,
  deleteBadge,
  awardBadgeToUser,
  getUserBadges
};
