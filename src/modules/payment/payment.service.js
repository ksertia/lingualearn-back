const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const orangeProvider = require('./providers/orange');
const moovProvider   = require('./providers/moov');

const OTP_EXPIRY_MINUTES = 5;
const SUPPORTED_METHODS  = ['orange_money', 'moov_money', 'coris_money'];
const IS_DEV = process.env.NODE_ENV !== 'production';

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

  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  let otpCode = null;
  let providerRef = null;
  let devOtp = null;

  // ── Orange Money ──────────────────────────────────────────────────────────────
  if (paymentMethod === 'orange_money') {
    const orderId = `LL-${Date.now()}`;
    try {
      const result = await orangeProvider.initiatePayment({
        phoneNumber,
        amount: Number(amount),
        currency: plan.currency ?? 'XOF',
        orderId,
      });
      providerRef = result.payToken;
      // Orange envoie l'OTP directement au téléphone — on ne le stocke pas
    } catch (err) {
      throw new AppError(502, `Orange Money: ${err.message}`);
    }
  }

  // ── Moov Money ────────────────────────────────────────────────────────────────
  else if (paymentMethod === 'moov_money') {
    const orderId = `LL-${Date.now()}`;
    try {
      const result = await moovProvider.initiatePayment({
        phoneNumber,
        amount: Number(amount),
        orderId,
      });
      providerRef = result.otpReference;
      // Moov envoie aussi l'OTP au téléphone
    } catch (err) {
      throw new AppError(502, `Moov Money: ${err.message}`);
    }
  }

  // ── Mode fictif (coris_money ou dev) ─────────────────────────────────────────
  else {
    otpCode = generateOtp();
    devOtp  = IS_DEV ? otpCode : undefined;
  }

  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      userId,
      planId,
      billingCycle,
      paymentMethod,
      phoneNumber,
      amount,
      currency:    plan.currency ?? 'XOF',
      otpCode,       // null pour orange/moov (OTP géré par l'opérateur)
      providerRef,   // pay_token Orange ou otpReference Moov
      otpExpiresAt,
      status: 'pending',
    },
    include: { plan: true },
  });

  const response = {
    paymentRequestId: paymentRequest.id,
    phoneNumber,
    amount:       paymentRequest.amount,
    currency:     paymentRequest.currency,
    plan:         { id: plan.id, planName: plan.planName, planCode: plan.planCode },
    otpExpiresAt,
  };

  if (devOtp) response._devOtp = devOtp;

  return response;
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

  // ── Vérification OTP selon l'opérateur ───────────────────────────────────────
  if (paymentRequest.paymentMethod === 'orange_money') {
    try {
      const status = await orangeProvider.checkPaymentStatus(paymentRequest.providerRef);
      if (status.status !== 'SUCCESS') {
        throw new AppError(400, `Orange Money: paiement non confirmé (${status.status}).`);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(502, `Orange Money: ${err.message}`);
    }
  } else if (paymentRequest.paymentMethod === 'moov_money') {
    try {
      await moovProvider.confirmPayment({
        phoneNumber:  paymentRequest.phoneNumber,
        amount:       Number(paymentRequest.amount),
        orderId:      paymentRequest.providerRef,
        otpCode,
        otpReference: paymentRequest.providerRef,
      });
    } catch (err) {
      await prisma.paymentRequest.update({
        where: { id: paymentRequestId },
        data: { status: 'failed', failureReason: err.message },
      });
      throw new AppError(400, err.message);
    }
  } else {
    // coris_money ou mode fictif : vérification locale du code OTP
    if (paymentRequest.otpCode !== otpCode) {
      throw new AppError(400, 'Code OTP incorrect.');
    }
  }

  // ── OTP valide → créer l'abonnement ──────────────────────────────────────────
  const periodStart = new Date();
  const periodEnd   = new Date(periodStart);
  if (paymentRequest.billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

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

  await prisma.user.update({
    where: { id: paymentRequest.userId },
    data: {
      subscriptionId:     subscription.id,
      subscriptionEndsAt: periodEnd,
    },
  });

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
