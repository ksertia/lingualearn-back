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
    res.json(tx);
  } catch (err) {
    next(err);
  }
}

module.exports = { listByUser, getOne };
