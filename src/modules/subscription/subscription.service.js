const { prisma } = require('../../config/prisma');

async function createSubscription(data) {
  return prisma.subscription.create({ data });
}

async function getAllSubscriptions() {
  return prisma.subscription.findMany({ include: { plan: true, user: true } });
}

async function getSubscriptionById(id) {
  return prisma.subscription.findUnique({ where: { id }, include: { plan: true, user: true } });
}

async function updateSubscription(id, data) {
  return prisma.subscription.update({ where: { id }, data });
}

async function deleteSubscription(id) {
  return prisma.subscription.delete({ where: { id } });
}

module.exports = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription
};
