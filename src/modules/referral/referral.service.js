const { prisma } = require('../../config/prisma');
const { cacheDel } = require('../../utils/cache');

const PARRAIN_XP    = 50;
const PARRAIN_COINS = 20;
const FILLEUL_XP    = 20;

function _generateCode(userId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = userId.slice(-4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `LL-${rand}${suffix}`;
}

async function getOrCreateReferralCode(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (user?.referralCode) return user.referralCode;

  let code;
  let attempts = 0;
  do {
    code = _generateCode(userId);
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
  return code;
}

async function getReferralStats(userId) {
  const code = await getOrCreateReferralCode(userId);

  const [referrals, totalRewarded] = await Promise.all([
    prisma.referral.findMany({
      where: { parrainId: userId },
      include: { filleul: { select: { username: true, createdAt: true, profile: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.referral.count({ where: { parrainId: userId, status: 'rewarded' } })
  ]);

  return {
    referralCode: code,
    totalFilleuls: referrals.length,
    totalRewarded,
    totalXpEarned: totalRewarded * PARRAIN_XP,
    totalCoinsEarned: totalRewarded * PARRAIN_COINS,
    filleuls: referrals.map(r => ({
      username: r.filleul.username,
      firstName: r.filleul.profile?.firstName,
      lastName: r.filleul.profile?.lastName,
      status: r.status,
      joinedAt: r.createdAt,
      rewardedAt: r.rewardedAt
    }))
  };
}

async function applyReferralCode(filleulId, code) {
  const parrain = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  if (!parrain) throw new Error('Code de parrainage invalide');
  if (parrain.id === filleulId) throw new Error('Vous ne pouvez pas utiliser votre propre code');

  const existing = await prisma.referral.findUnique({ where: { filleulId } });
  if (existing) throw new Error('Vous avez déjà utilisé un code de parrainage');

  await prisma.$transaction([
    prisma.referral.create({ data: { parrainId: parrain.id, filleulId } }),
    prisma.user.update({ where: { id: filleulId }, data: { referredBy: parrain.id } }),
    prisma.userStats.upsert({
      where: { userId: filleulId },
      create: { userId: filleulId, totalXp: FILLEUL_XP },
      update: { totalXp: { increment: FILLEUL_XP } }
    })
  ]);

  cacheDel(`user:${filleulId}:base`).catch(() => {});
  return { success: true, message: `Code appliqué ! Vous avez reçu ${FILLEUL_XP} XP de bienvenue.` };
}

async function rewardParrainIfEligible(filleulId) {
  const referral = await prisma.referral.findUnique({
    where: { filleulId },
    select: { id: true, parrainId: true, status: true }
  });
  if (!referral || referral.status === 'rewarded') return;

  const lessonsCompleted = await prisma.userStepProgress.count({
    where: { userId: filleulId, status: 'completed', step: { stepType: 'lesson' } }
  });
  if (lessonsCompleted < 1) return;

  await prisma.$transaction([
    prisma.referral.update({ where: { id: referral.id }, data: { status: 'rewarded', rewardedAt: new Date() } }),
    prisma.userStats.upsert({
      where: { userId: referral.parrainId },
      create: { userId: referral.parrainId, totalXp: PARRAIN_XP, totalCoins: PARRAIN_COINS },
      update: { totalXp: { increment: PARRAIN_XP }, totalCoins: { increment: PARRAIN_COINS } }
    })
  ]);

  cacheDel(`user:${referral.parrainId}:base`, `gamification:user:${referral.parrainId}:stats`).catch(() => {});
}

module.exports = { getOrCreateReferralCode, getReferralStats, applyReferralCode, rewardParrainIfEligible };
