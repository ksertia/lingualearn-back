const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

async function getAllSettings() {
  return prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
}

async function getSetting(key) {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  if (!setting) throw new AppError(404, `Paramètre "${key}" introuvable`);
  return setting;
}

async function upsertSetting(key, value) {
  return prisma.appSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

// Ajuster l'abonnement d'un learner (prolonger ou réduire)
async function adjustUserTrial(userId, newExpiresAt) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, accountType: true },
  });

  if (!user) throw new AppError(404, 'Utilisateur introuvable');
  if (user.accountType !== 'learner') {
    throw new AppError(400, 'Seuls les comptes learner peuvent avoir un abonnement ajusté');
  }

  const expiry = new Date(newExpiresAt);
  if (isNaN(expiry.getTime())) throw new AppError(400, 'Date invalide');

  // Source de vérité : chercher directement par userId sur Subscription
  const existing = await prisma.subscription.findUnique({ where: { userId } });

  if (!existing) {
    const trialPlan = await prisma.subscriptionPlan.findUnique({ where: { planCode: 'TRIAL' } });
    if (!trialPlan) throw new AppError(500, 'Plan TRIAL introuvable');

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId: trialPlan.id,
        status: 'active',
        billingCycle: 'trial',
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiry,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { subscriptionId: subscription.id, subscriptionEndsAt: expiry },
    });

    return subscription;
  }

  // Mettre à jour la date de fin (et réactiver si expiré)
  const updated = await prisma.subscription.update({
    where: { userId },
    data: { currentPeriodEnd: expiry, status: 'active' },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionEndsAt: expiry },
  });

  return updated;
}

module.exports = { getAllSettings, getSetting, upsertSetting, adjustUserTrial };
