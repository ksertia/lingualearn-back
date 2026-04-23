const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

const OTP_EXPIRY_MINUTES = 5;
const SUPPORTED_METHODS = ['orange_money', 'moov_money', 'coris_money'];

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function initiatePayment({ userId, planId, billingCycle, paymentMethod, phoneNumber }) {
  if (!SUPPORTED_METHODS.includes(paymentMethod)) {
    throw new AppError(400, `Méthode de paiement non supportée. Utilisez : ${SUPPORTED_METHODS.join(', ')}`);
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new AppError(404, 'Plan introuvable.');
  if (!plan.isActive) throw new AppError(400, 'Ce plan est inactif.');

  const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  if (!amount) throw new AppError(400, `Ce plan n'a pas de prix défini pour le cycle ${billingCycle}.`);

  // Annuler les anciennes demandes pending du même utilisateur
  await prisma.paymentRequest.updateMany({
    where: { userId, status: 'pending' },
    data: { status: 'failed', failureReason: 'Remplacé par une nouvelle demande' },
  });

  const otpCode = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      userId,
      planId,
      billingCycle,
      paymentMethod,
      phoneNumber,
      amount,
      currency: plan.currency ?? 'XOF',
      otpCode,
      otpExpiresAt,
      status: 'pending',
    },
    include: { plan: true },
  });

  // En production : envoyer l'OTP par SMS ici
  // Pour l'instant on le retourne directement (mode fictif)
  return {
    paymentRequestId: paymentRequest.id,
    phoneNumber,
    amount: paymentRequest.amount,
    currency: paymentRequest.currency,
    plan: { id: plan.id, planName: plan.planName, planCode: plan.planCode },
    otpExpiresAt,
    // ⚠️ Mode fictif uniquement — à retirer en production
    _devOtp: otpCode,
  };
}

async function confirmPayment({ paymentRequestId, otpCode }) {
  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: { id: paymentRequestId },
    include: { plan: true },
  });

  if (!paymentRequest) throw new AppError(404, 'Demande de paiement introuvable.');
  if (paymentRequest.status !== 'pending') {
    throw new AppError(400, `Cette demande est déjà ${paymentRequest.status}.`);
  }
  if (new Date() > new Date(paymentRequest.otpExpiresAt)) {
    await prisma.paymentRequest.update({
      where: { id: paymentRequestId },
      data: { status: 'failed', failureReason: 'OTP expiré' },
    });
    throw new AppError(400, 'Le code OTP a expiré. Veuillez recommencer.');
  }
  if (paymentRequest.otpCode !== otpCode) {
    throw new AppError(400, 'Code OTP incorrect.');
  }

  // OTP valide → créer l'abonnement
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  if (paymentRequest.billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Supprimer l'abonnement existant si présent (renouvellement)
  await prisma.subscription.deleteMany({ where: { userId: paymentRequest.userId } });

  const subscription = await prisma.subscription.create({
    data: {
      userId:             paymentRequest.userId,
      planId:             paymentRequest.planId,
      status:             'active',
      billingCycle:       paymentRequest.billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd:   periodEnd,
      cancelAtPeriodEnd:  false,
    },
    include: { plan: true },
  });

  // Synchroniser le user
  await prisma.user.update({
    where: { id: paymentRequest.userId },
    data: {
      subscriptionId:     subscription.id,
      subscriptionEndsAt: periodEnd,
    },
  });

  // Enregistrer la transaction
  await prisma.transaction.create({
    data: {
      userId:          paymentRequest.userId,
      transactionType: 'subscription_payment',
      amount:          paymentRequest.amount,
      currency:        paymentRequest.currency,
      description:     `Abonnement ${paymentRequest.plan.planName} - ${paymentRequest.billingCycle}`,
      referenceType:   'subscription',
      referenceId:     subscription.id,
    },
  });

  // Marquer la demande comme confirmée
  await prisma.paymentRequest.update({
    where: { id: paymentRequestId },
    data: { status: 'confirmed', otpVerified: true, confirmedAt: new Date() },
  });

  return subscription;
}

async function getPaymentHistory(userId) {
  return prisma.paymentRequest.findMany({
    where: { userId },
    include: { plan: { select: { planName: true, planCode: true, currency: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { initiatePayment, confirmPayment, getPaymentHistory };
