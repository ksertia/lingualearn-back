const { prisma } = require('../../config/prisma');

async function createSubscriptionPlan(data) {
  return prisma.subscriptionPlan.create({ data });
}

async function getAllSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany();
}

async function getSubscriptionPlanById(id) {
  return prisma.subscriptionPlan.findUnique({ where: { id } });
}

async function updateSubscriptionPlan(id, data) {
  return prisma.subscriptionPlan.update({ where: { id }, data });
}

async function deleteSubscriptionPlan(id) {
  return prisma.subscriptionPlan.delete({ where: { id } });
}

module.exports = {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  deleteSubscriptionPlan
};
