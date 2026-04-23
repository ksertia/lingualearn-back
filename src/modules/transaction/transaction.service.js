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

async function createTransaction({ userId, transactionType, amount, currency = 'XOF', description, referenceType, referenceId }) {
  return prisma.transaction.create({
    data: { userId, transactionType, amount, currency, description, referenceType, referenceId },
  });
}

module.exports = { getTransactionsByUser, getTransactionById, createTransaction };
