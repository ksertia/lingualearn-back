const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

// Client dédié au CRON avec pool minimal pour ne pas concurrencer les requêtes HTTP
const cronPrisma = new PrismaClient({
  log: ['error'],
  datasources: { db: { url: process.env.DATABASE_URL + '?connection_limit=2' } },
});

// Toutes les heures à HH:00 : supprime les abonnements expirés
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    const expired = await cronPrisma.subscription.findMany({
      where: { status: 'active', currentPeriodEnd: { lt: now } },
      select: { id: true, userId: true },
    });

    if (expired.length === 0) return;

    const ids     = expired.map(s => s.id);
    const userIds = expired.map(s => s.userId);

    await cronPrisma.subscription.deleteMany({ where: { id: { in: ids } } });
    await cronPrisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { subscriptionId: null, subscriptionEndsAt: null },
    });

    console.log(`[cron] ${expired.length} abonnement(s) expiré(s) supprimé(s)`);
  } catch (err) {
    console.error('[cron] Erreur nettoyage abonnements:', err.message);
  }
});

// Toutes les heures à HH:05 (décalé pour éviter la concurrence sur le pool)
cron.schedule('5 * * * *', async () => {
  try {
    const now = new Date();

    const { count } = await cronPrisma.paymentRequest.updateMany({
      where: { status: 'pending', otpExpiresAt: { lt: now } },
      data: { status: 'failed', failureReason: 'OTP expiré' },
    });

    if (count > 0) {
      console.log(`[cron] ${count} demande(s) de paiement expirée(s) marquées failed`);
    }
  } catch (err) {
    console.error('[cron] Erreur nettoyage paiements:', err.message);
  }
});

console.log('[cron] Jobs planifiés : abonnements (HH:00) + paiements (HH:05)');
