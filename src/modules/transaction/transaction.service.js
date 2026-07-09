const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

async function getTransactionsByUser(userId, { page = 1, limit = 20, type } = {}) {
  const skip = (page - 1) * limit;
  const where = { userId, ...(type ? { transactionType: type } : {}) };

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { total, page, limit, items };
}

async function getTransactionById(id) {
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) throw new AppError(404, 'Transaction introuvable.');
  return tx;
}

async function createTransaction({ userId, transactionType, amount, currency = 'XOF', amountCoins, description, referenceType, referenceId, balanceCoinsAfter, metadata }) {
  return prisma.transaction.create({
    data: { userId, transactionType, amount, currency, amountCoins, description, referenceType, referenceId, balanceCoinsAfter, metadata },
  });
}

// Enregistre un mouvement de coins dans le wallet et retourne la transaction
async function recordCoinTransaction({ userId, amountCoins, transactionType, description, referenceType, referenceId }) {
  const stats = await prisma.userStats.findUnique({ where: { userId }, select: { totalCoins: true } });
  const balanceAfter = (stats?.totalCoins ?? 0) + amountCoins; // amountCoins négatif pour dépense

  return prisma.transaction.create({
    data: {
      userId,
      transactionType,
      amountCoins,
      description,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      balanceCoinsAfter: balanceAfter,
      currency: 'COINS',
    },
  });
}

// Wallet : solde + historique coins
async function getWallet(userId) {
  const [stats, history] = await Promise.all([
    prisma.userStats.findUnique({
      where: { userId },
      select: { totalCoins: true, totalXp: true }
    }),
    prisma.transaction.findMany({
      where: { userId, currency: 'COINS' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, transactionType: true, amountCoins: true, balanceCoinsAfter: true, description: true, referenceType: true, referenceId: true, createdAt: true }
    })
  ]);

  return {
    balance: stats?.totalCoins ?? 0,
    totalXp: stats?.totalXp ?? 0,
    history
  };
}

module.exports = { getTransactionsByUser, getTransactionById, createTransaction, recordCoinTransaction, getWallet };
