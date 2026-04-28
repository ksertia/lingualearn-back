const { asyncHandler } = require('../../middleware/asyncHandler');
const service = require('./app_setting.service');

// GET /admin/settings
const getSettings = asyncHandler(async (req, res) => {
  const settings = await service.getAllSettings();
  res.json({ success: true, data: settings });
});

// GET /admin/settings/:key
const getSettingByKey = asyncHandler(async (req, res) => {
  const setting = await service.getSetting(req.params.key);
  res.json({ success: true, data: setting });
});

const ALLOWED_SETTINGS = {
  trial_duration_days: (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1 || n > 365) return 'La durée doit être entre 1 et 365 jours';
  },
};

// PATCH /admin/settings/:key
const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!(key in ALLOWED_SETTINGS)) {
    return res.status(400).json({ success: false, message: `Paramètre "${key}" non modifiable` });
  }

  if (value === undefined || value === null || value === '') {
    return res.status(400).json({ success: false, message: 'La valeur est requise' });
  }

  const validationError = ALLOWED_SETTINGS[key](value);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const setting = await service.upsertSetting(key, value);
  res.json({ success: true, data: setting });
});

// PATCH /admin/users/:id/trial
const adjustUserTrial = asyncHandler(async (req, res) => {
  const { expiresAt } = req.body;
  if (!expiresAt) {
    return res.status(400).json({ success: false, message: 'expiresAt est requis (ISO 8601)' });
  }
  const subscription = await service.adjustUserTrial(req.params.id, expiresAt);
  res.json({ success: true, data: subscription });
});

module.exports = { getSettings, getSettingByKey, updateSetting, adjustUserTrial };
