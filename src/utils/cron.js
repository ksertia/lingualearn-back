const cron = require('node-cron');
const { prisma } = require('../config/prisma');

// Toutes les heures : supprime les abonnements expirés et nettoie le user
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    // Récupérer tous les abonnements expirés encore actifs
    const expired = await prisma.subscription.findMany({
      where: {
        status: 'active',
        currentPeriodEnd: { lt: now },
      },
      select: { id: true, userId: true },
    });

    if (expired.length === 0) return;

    const ids     = expired.map(s => s.id);
    const userIds = expired.map(s => s.userId);

    // Supprimer les abonnements expirés
    await prisma.subscription.deleteMany({ where: { id: { in: ids } } });

    // Nettoyer les champs rapides sur chaque user
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        subscriptionId:     null,
        subscriptionEndsAt: null,
      },
    });

    console.log(`[cron] ${expired.length} abonnement(s) expiré(s) supprimé(s)`);
  } catch (err) {
    console.error('[cron] Erreur nettoyage abonnements:', err.message);
  }
});

// Toutes les heures : passe en failed les PaymentRequest pending avec OTP expiré
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    const { count } = await prisma.paymentRequest.updateMany({
      where: {
        status:      'pending',
        otpExpiresAt: { lt: now },
      },
      data: {
        status:        'failed',
        failureReason: 'OTP expiré',
      },
    });

    if (count > 0) {
      console.log(`[cron] ${count} demande(s) de paiement expirée(s) marquées failed`);
    }
  } catch (err) {
    console.error('[cron] Erreur nettoyage paiements:', err.message);
  }
});

console.log('[cron] Jobs planifiés : nettoyage abonnements + paiements (toutes les heures)');
