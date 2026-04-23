const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');
const orange = require('./providers/orange');
const moov   = require('./providers/moov');
const { verifyOperator } = require('./providers/verifyOperator');

const OTP_EXPIRY_MINUTES = 5;
const SUPPORTED_METHODS  = ['orange_money', 'moov_money', 'coris_money'];
const IS_DEV = process.env.NODE_ENV !== 'production';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function makeOrderId() {
  return `LL-${Date.now()}`;
}

// ─── ÉTAPE 1 : Initier le paiement ───────────────────────────────────────────
async function initiatePayment({ userId, planId, billingCycle, paymentMethod, phoneNumber }) {
  if (!SUPPORTED_METHODS.includes(paymentMethod)) {
    throw new AppError(400, `Méthode de paiement non supportée. Utilisez : ${SUPPORTED_METHODS.join(', ')}`);
  }

  // Valider que le numéro correspond à l'opérateur choisi
  try {
    verifyOperator(paymentMethod, phoneNumber);
  } catch (err) {
    throw new AppError(400, err.message);
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
  const orderId      = makeOrderId();

  let otpCode    = null;
  let providerRef = null;
  let devOtp     = null;
  let instructions = null;

  // ── Orange Money ─────────────────────────────────────────────────────────────
  // L'OTP est généré côté client via USSD — pas d'appel API ici
  if (paymentMethod === 'orange_money') {
    providerRef  = orderId;
    instructions = `Composez *144*4*6*${Number(amount)}# sur votre téléphone pour obtenir votre code OTP, puis saisissez-le ici.`;
  }

  // ── Moov Money ───────────────────────────────────────────────────────────────
  // L'API envoie automatiquement un SMS OTP au client
  else if (paymentMethod === 'moov_money') {
    try {
      const result = await moov.sendOtp({
        transactionId: orderId,
        phoneNumber,
        amount: Number(amount),
      });
      // moovTransId = trans-id Moov, nécessaire à la confirmation
      providerRef = `${orderId}|${result.moovTransId}`;
    } catch (err) {
      throw new AppError(502, `Moov Money: ${err.message}`);
    }
  }

  // ── Coris Money / mode fictif ─────────────────────────────────────────────
  else {
    otpCode = generateOtp();
    if (IS_DEV) devOtp = otpCode;
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
      otpCode,
      providerRef,
      otpExpiresAt,
      status: 'pending',
    },
    include: { plan: true },
  });

  const response = {
    paymentRequestId: paymentRequest.id,
    phoneNumber,
    amount:      paymentRequest.amount,
    currency:    paymentRequest.currency,
    plan:        { id: plan.id, planName: plan.planName, planCode: plan.planCode },
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

  // ── Vérification selon l'opérateur ───────────────────────────────────────
  if (paymentRequest.paymentMethod === 'orange_money') {
    try {
      await orange.confirmPayment({
        phoneNumber: paymentRequest.phoneNumber,
        amount:      Number(paymentRequest.amount),
        otp:         otpCode,
        orderId:     paymentRequest.providerRef,
      });
    } catch (err) {
      await prisma.paymentRequest.update({
        where: { id: paymentRequestId },
        data: { status: 'failed', failureReason: err.message },
      });
      throw new AppError(400, `Orange Money: ${err.message}`);
    }
  } else if (paymentRequest.paymentMethod === 'moov_money') {
    // providerRef format : "orderId|moovTransId"
    const [requestId, moovTransId] = (paymentRequest.providerRef ?? '').split('|');
    const newRequestId = makeOrderId();
    try {
      await moov.confirmPayment({
        newRequestId,
        moovTransId,
        requestId,
        phoneNumber: paymentRequest.phoneNumber,
        amount:      Number(paymentRequest.amount),
        otp:         otpCode,
      });
    } catch (err) {
      await prisma.paymentRequest.update({
        where: { id: paymentRequestId },
        data: { status: 'failed', failureReason: err.message },
      });
      throw new AppError(400, `Moov Money: ${err.message}`);
    }
  } else {
    // coris_money ou mode fictif : vérification locale
    if (paymentRequest.otpCode !== otpCode) {
      throw new AppError(400, 'Code OTP incorrect.');
    }
  }

  // ── OTP valide → créer l'abonnement ──────────────────────────────────────
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
