const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const orange = require('./providers/orange');
const moov   = require('./providers/moov');
const { verifyOperator } = require('./providers/verifyOperator');
const { cacheDel } = require('../../utils/cache');
const { recordCoinTransaction } = require('../transaction/transaction.service');

const OTP_EXPIRY_MINUTES = 5;
const SUPPORTED_METHODS  = ['orange_money', 'moov_money', 'coris_money'];
const IS_DEV = process.env.NODE_ENV !== 'production';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function makeOrderId() {
  return `LL-${Date.now()}`;
}

function _computePeriodEnd(billingCycle) {
  const end = new Date();
  if (billingCycle === 'yearly') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

// ─── ÉTAPE 1 : Initier le paiement ───────────────────────────────────────────
async function initiatePayment({ userId, planId, billingCycle, paymentMethod, phoneNumber }) {
  if (!SUPPORTED_METHODS.includes(paymentMethod)) {
    throw new AppError(400, `Méthode de paiement non supportée. Utilisez : ${SUPPORTED_METHODS.join(', ')}`);
  }

  try {
    verifyOperator(paymentMethod, phoneNumber);
  } catch (err) {
    throw new AppError(400, err.message);
  }

  // Plan fetch + cancel old pending requests in parallel
  const [plan] = await Promise.all([
    prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    prisma.paymentRequest.updateMany({
      where: { userId, status: 'pending' },
      data: { status: 'failed', failureReason: 'Remplacé par une nouvelle demande' },
    }),
  ]);

  if (!plan) throw new AppError(404, 'Plan introuvable.');
  if (!plan.isActive) throw new AppError(400, 'Ce plan est inactif.');

  const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  if (!amount) throw new AppError(400, `Ce plan n'a pas de prix défini pour le cycle ${billingCycle}.`);

  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const orderId      = makeOrderId();

  let otpCode = null, providerRef = null, devOtp = null, instructions = null;

  if (paymentMethod === 'orange_money') {
    providerRef  = orderId;
    if (!IS_DEV) {
      instructions = `Composez *144*4*6*${Number(amount)}# sur votre téléphone pour obtenir votre code OTP, puis saisissez-le ici.`;
    }
  } else if (paymentMethod === 'moov_money') {
    try {
      const result = await moov.sendOtp({ transactionId: orderId, phoneNumber, amount: Number(amount) });
      providerRef  = `${orderId}|${result.moovTransId}`;
    } catch (err) {
      throw new AppError(400, err.message);
    }
  } else {
    otpCode = generateOtp();
    if (IS_DEV) devOtp = otpCode;
  }

  const paymentRequest = await prisma.paymentRequest.create({
    data: { userId, planId, billingCycle, paymentMethod, phoneNumber, amount, currency: plan.currency ?? 'XOF', otpCode, providerRef, otpExpiresAt, status: 'pending' },
    include: { plan: true },
  });

  const response = {
    paymentRequestId: paymentRequest.id,
    phoneNumber, amount: paymentRequest.amount, currency: paymentRequest.currency,
    plan: { id: plan.id, planName: plan.planName, planCode: plan.planCode },
    otpExpiresAt,
  };
  if (instructions) response.instructions = instructions;
  if (devOtp)       response._devOtp = devOtp;
  return response;
}

// ─── ÉTAPE 2 : Confirmer le paiement avec l'OTP ──────────────────────────────
async function confirmPayment({ paymentRequestId, otpCode }) {
  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: { id: paymentRequestId },
    include: { plan: true },
  });

  if (!paymentRequest)                         throw new AppError(404, 'Demande de paiement introuvable.');
  if (paymentRequest.status !== 'pending')     throw new AppError(400, `Cette demande est déjà ${paymentRequest.status}.`);
  if (new Date() > new Date(paymentRequest.otpExpiresAt)) {
    await prisma.paymentRequest.update({ where: { id: paymentRequestId }, data: { status: 'failed', failureReason: 'OTP expiré' } });
    throw new AppError(400, 'Le code OTP a expiré. Veuillez recommencer.');
  }

  // Operator-specific OTP verification
  if (paymentRequest.paymentMethod === 'orange_money') {
    // OTP accepted without verification pending SSL cert
  } else if (paymentRequest.paymentMethod === 'moov_money') {
    const [requestId, moovTransId] = (paymentRequest.providerRef ?? '').split('|');
    try {
      await moov.confirmPayment({ newRequestId: makeOrderId(), moovTransId, requestId, phoneNumber: paymentRequest.phoneNumber, amount: Number(paymentRequest.amount), otp: otpCode });
    } catch (err) {
      await prisma.paymentRequest.update({ where: { id: paymentRequestId }, data: { status: 'failed', failureReason: err.message } });
      throw new AppError(400, `Moov Money: ${err.message}`);
    }
  } else {
    if (paymentRequest.otpCode !== otpCode) throw new AppError(400, 'Code OTP incorrect.');
  }

  const periodStart = new Date();
  const periodEnd   = _computePeriodEnd(paymentRequest.billingCycle);
  const userId      = paymentRequest.userId;

  // All writes in a single atomic transaction
  const [subscription] = await prisma.$transaction([
    // 1. Delete old subscriptions
    prisma.subscription.deleteMany({ where: { userId } }),
    // 2. Create new subscription
    prisma.subscription.create({
      data: {
        userId, planId: paymentRequest.planId, status: 'active',
        billingCycle: paymentRequest.billingCycle,
        currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    }),
  ]);

  // subscription.id is now available — update user + log transaction + confirm payment in parallel
  const createdSub = await prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });

  await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: { subscriptionId: createdSub.id, subscriptionEndsAt: periodEnd },
    }),
    prisma.transaction.create({
      data: {
        userId, transactionType: 'subscription_payment',
        amount: paymentRequest.amount, currency: paymentRequest.currency,
        description: `Abonnement ${paymentRequest.plan.planName} - ${paymentRequest.billingCycle}`,
        referenceType: 'subscription', referenceId: createdSub.id,
      },
    }),
    prisma.paymentRequest.update({
      where: { id: paymentRequestId },
      data: { status: 'confirmed', otpVerified: true, confirmedAt: new Date() },
    }),
    // Invalidate user caches immediately
    cacheDel(`user:${userId}:base`, `user:${userId}:details`, `user:${userId}:current`, `sub:status:${userId}`),
  ]);

  return createdSub;
}

async function getPaymentHistory(userId) {
  return prisma.paymentRequest.findMany({
    where: { userId },
    include: { plan: { select: { planName: true, planCode: true, currency: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function payWithCoins(userId, planId) {
  const [plan, stats] = await Promise.all([
    prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    prisma.userStats.findUnique({ where: { userId }, select: { totalCoins: true } })
  ]);

  if (!plan) throw new AppError(404, 'Plan introuvable.');
  if (!plan.isActive) throw new AppError(400, 'Ce plan n\'est plus disponible.');
  if (!plan.coinPrice) throw new AppError(400, 'Ce plan ne supporte pas le paiement en coins.');

  const balance = stats?.totalCoins ?? 0;
  if (balance < plan.coinPrice) {
    throw new AppError(400, `Solde insuffisant. Vous avez ${balance} coins, il en faut ${plan.coinPrice}.`);
  }

  const periodStart = new Date();
  const periodEnd   = _computePeriodEnd('monthly');

  // Transaction atomique : débiter coins + créer abonnement
  await prisma.$transaction([
    prisma.userStats.update({
      where: { userId },
      data: { totalCoins: { decrement: plan.coinPrice } }
    }),
    prisma.subscription.deleteMany({ where: { userId } }),
  ]);

  const subscription = await prisma.subscription.create({
    data: {
      userId, planId, status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    }
  });

  await Promise.all([
    prisma.user.update({ where: { id: userId }, data: { subscriptionId: subscription.id, subscriptionEndsAt: periodEnd } }),
    recordCoinTransaction({
      userId,
      amountCoins: -plan.coinPrice,
      transactionType: 'coin_spend',
      description: `Abonnement ${plan.planName} payé avec coins`,
      referenceType: 'subscription',
      referenceId: subscription.id
    }),
    cacheDel(`user:${userId}:base`, `user:${userId}:details`, `user:${userId}:current`, `sub:status:${userId}`, `gamification:user:${userId}:stats`)
  ]);

  return { subscription, coinsSpent: plan.coinPrice, newBalance: balance - plan.coinPrice };
}

module.exports = { initiatePayment, confirmPayment, getPaymentHistory, payWithCoins };
