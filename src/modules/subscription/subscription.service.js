const { prisma } = require('../../config/prisma');

async function createSubscription(data) {
  const subscription = await prisma.subscription.create({
    data,
    include: { plan: true },
  });

  // Synchroniser les champs rapides sur le user
  await prisma.user.update({
    where: { id: data.userId },
    data: {
      subscriptionId:     subscription.id,
      subscriptionEndsAt: subscription.currentPeriodEnd,
    },
  });

  return subscription;
}

async function getAllSubscriptions() {
  return prisma.subscription.findMany({
    include: { plan: true, user: true },
  });
}

async function getSubscriptionById(id) {
  return prisma.subscription.findUnique({
    where: { id },
    include: { plan: true, user: true },
  });
}

async function updateSubscription(id, data) {
  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) return null;

  const subscription = await prisma.subscription.update({
    where: { id },
    data,
    include: { plan: true },
  });

  // Resynchroniser subscriptionEndsAt si la période a changé
  if (data.currentPeriodEnd !== undefined) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { subscriptionEndsAt: subscription.currentPeriodEnd },
    });
  }

  return subscription;
}

async function deleteSubscription(id) {
  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) return null;

  await prisma.subscription.delete({ where: { id } });

  // Nettoyer les champs rapides sur le user
  await prisma.user.update({
    where: { id: existing.userId },
    data: {
      subscriptionId:     null,
      subscriptionEndsAt: null,
    },
  });

  return existing;
}

module.exports = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};
