const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

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
  const result = await prisma.subscriptionPlan.create({
    data: { ...rest, priceMonthly: priceMonthly ?? null, reducePrice: reducePrice ?? null, percentage: computePercentage(priceMonthly, reducePrice) },
  });
  await cacheDel('subscription_plans:all');
  return result;
}

async function getAllSubscriptionPlans() {
  return cacheWrap('subscription_plans:all', () =>
    prisma.subscriptionPlan.findMany({ include: { _count: { select: { subscriptions: true } } } }),
    TTL.DAY
  );
}

async function getSubscriptionPlanById(id) {
  return cacheWrap(`subscription_plan:${id}`, () =>
    prisma.subscriptionPlan.findUnique({ where: { id }, include: { _count: { select: { subscriptions: true } } } }),
    TTL.DAY
  );
}

async function updateSubscriptionPlan(id, data) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) return null;

  const priceMonthly = data.priceMonthly !== undefined ? data.priceMonthly : existing.priceMonthly;
  const reducePrice  = data.reducePrice  !== undefined ? data.reducePrice  : existing.reducePrice;

  const result = await prisma.subscriptionPlan.update({
    where: { id },
    data: { ...data, percentage: computePercentage(priceMonthly, reducePrice) },
  });
  await cacheDel('subscription_plans:all', `subscription_plan:${id}`);
  return result;
}

async function deleteSubscriptionPlan(id) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) return null;
  const result = await prisma.subscriptionPlan.delete({ where: { id } });
  await cacheDel('subscription_plans:all', `subscription_plan:${id}`);
  return result;
}

module.exports = {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
};
