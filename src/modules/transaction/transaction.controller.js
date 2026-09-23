const service = require('./transaction.service');

async function listByUser(req, res, next) {
  try {
    const { userId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type  = req.query.type || undefined;
    const result = await service.getTransactionsByUser(userId, { page, limit, type });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const tx = await service.getTransactionById(req.params.id);
    const isPrivileged = ['admin', 'plateform_manager'].includes(req.user.accountType);
    if (!isPrivileged && tx.userId !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez consulter que vos propres transactions.' });
    }
    res.json(tx);
  } catch (err) {
    next(err);
  }
}

async function getMyWallet(req, res, next) {
  try {
    const wallet = await service.getWallet(req.user.id);
    res.json({ success: true, data: wallet });
  } catch (err) {
    next(err);
  }
}

module.exports = { listByUser, getOne, getMyWallet };
