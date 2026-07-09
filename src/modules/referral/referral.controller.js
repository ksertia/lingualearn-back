const referralService = require('./referral.service');

const getMyReferral = async (req, res, next) => {
  try {
    const stats = await referralService.getReferralStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};

const applyCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'code est requis' });
    const result = await referralService.applyReferralCode(req.user.id, code.toUpperCase().trim());
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = { getMyReferral, applyCode };
