const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

function computePeriodEnd(start, billingCycle) {
  const date = new Date(start);
  if (billingCycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
}

function _invalidateUser(userId) {
  return cacheDel(
    `user:${userId}:base`,
    `user:${userId}:details`,
    `user:${userId}:current`,
    `user:${userId}:state`
  );
}

async function createSubscription(data) {
  const periodStart = data.currentPeriodStart ?? new Date();
  const periodEnd   = computePeriodEnd(periodStart, data.billingCycle ?? 'monthly');

  // Create subscription + update user in a single transaction
  const [subscription] = await prisma.$transaction([
    prisma.subscription.create({
      data: {
        ...data,
        currentPeriodStart: periodStart,
        currentPeriodEnd:   periodEnd,
        cancelAtPeriodEnd:  data.cancelAtPeriodEnd ?? false,
        canceledAt:         null,
      },
      include: { plan: true },
    }),
    prisma.user.update({
      where: { id: data.userId },
      data: { subscriptionEndsAt: periodEnd },
    }),
  ]);

  // Update subscriptionId on user (needs subscription.id, so after creation)
  await prisma.user.update({
    where: { id: data.userId },
    data: { subscriptionId: subscription.id },
  });

  await _invalidateUser(data.userId);
  return subscription;
}

async function getAllSubscriptions() {
  return prisma.subscription.findMany({ include: { plan: true, user: true } });
}

async function getSubscriptionById(id) {
  return prisma.subscription.findUnique({ where: { id }, include: { plan: true, user: true } });
}

async function getMyStatus(userId) {
  return cacheWrap(`sub:status:${userId}`, async () => {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const isActive =
      subscription &&
      subscription.status === 'active' &&
      new Date(subscription.currentPeriodEnd) > new Date();

    return {
      hasSubscription: !!subscription,
      isActive: !!isActive,
      subscription: subscription ?? null,
      expiresAt: subscription?.currentPeriodEnd ?? null,
    };
  }, TTL.SHORT);
}

async function updateSubscription(id, data) {
  const existing = await prisma.subscription.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!existing) return null;

  const subscription = await prisma.subscription.update({
    where: { id },
    data,
    include: { plan: true },
  });

  // Sync subscriptionEndsAt if period changed
  const ops = [];
  if (data.currentPeriodEnd !== undefined) {
    ops.push(prisma.user.update({
      where: { id: existing.userId },
      data: { subscriptionEndsAt: subscription.currentPeriodEnd },
    }));
  }
  if (ops.length) await Promise.all(ops);

  await Promise.all([
    _invalidateUser(existing.userId),
    cacheDel(`sub:status:${existing.userId}`)
  ]);

  return subscription;
}

async function deleteSubscription(id) {
  const existing = await prisma.subscription.findUnique({ where: { id }, select: { id: true, userId: true } });
  if (!existing) return null;

  // Delete subscription + clean user fields in a transaction
  await prisma.$transaction([
    prisma.subscription.delete({ where: { id } }),
    prisma.user.update({
      where: { id: existing.userId },
      data: { subscriptionId: null, subscriptionEndsAt: null },
    }),
  ]);

  await Promise.all([
    _invalidateUser(existing.userId),
    cacheDel(`sub:status:${existing.userId}`)
  ]);

  return existing;
}

module.exports = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  getMyStatus,
  updateSubscription,
  deleteSubscription,
};
