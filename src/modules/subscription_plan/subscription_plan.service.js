const { prisma } = require('../../config/prisma');

// percentage = ((priceMonthly - reducePrice) / priceMonthly) * 100
function computePercentage(priceMonthly, reducePrice) {
  if (priceMonthly == null || reducePrice == null) return null;
  const price = parseFloat(priceMonthly);
  const reduced = parseFloat(reducePrice);
  if (price <= 0) return null;
  return Math.round(((price - reduced) / price) * 10000) / 100; // 2 décimales
}

async function createSubscriptionPlan(data) {
  const { reducePrice, priceMonthly, ...rest } = data;
  return prisma.subscriptionPlan.create({
    data: {
      ...rest,
      priceMonthly: priceMonthly ?? null,
      reducePrice: reducePrice ?? null,
      percentage: computePercentage(priceMonthly, reducePrice),
    },
  });
}

async function getAllSubscriptionPlans() {
  return prisma.subscriptionPlan.findMany({
    include: { _count: { select: { subscriptions: true } } },
  });
}

async function getSubscriptionPlanById(id) {
  return prisma.subscriptionPlan.findUnique({
    where: { id },
    include: { _count: { select: { subscriptions: true } } },
  });
}

async function updateSubscriptionPlan(id, data) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) return null;

  const priceMonthly = data.priceMonthly !== undefined ? data.priceMonthly : existing.priceMonthly;
  const reducePrice  = data.reducePrice  !== undefined ? data.reducePrice  : existing.reducePrice;

  return prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...data,
      percentage: computePercentage(priceMonthly, reducePrice),
    },
  });
}

async function deleteSubscriptionPlan(id) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) return null;
  return prisma.subscriptionPlan.delete({ where: { id } });
}

module.exports = {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
};
