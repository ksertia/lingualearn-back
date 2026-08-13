const progressService = require('./progress.service');

const getUserLevelProgress = async (req, res, next) => {
  try {
    const { userId, levelId } = req.params;
    const summary = await progressService.getUserLevelProgressSummary(userId, levelId);
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const getUserSubThemeProgress = async (req, res, next) => {
  try {
    const { userId, subThemeId } = req.params;
    const progress = await progressService.getUserSubThemeProgress(userId, subThemeId);
    res.status(200).json({ success: true, data: progress });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const getNextRecommended = async (req, res, next) => {
  try {
    const { userId, levelId } = req.params;
    const recommendation = await progressService.getNextRecommendedSubTheme(userId, levelId);
    res.status(200).json({ success: true, data: recommendation });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

const recalculateModule = async (req, res, next) => {
  try {
    const { userId, moduleId } = req.params;
    const result = await progressService.recalculateModuleAndLevelProgress(userId, moduleId);
    res.status(200).json({ success: true, data: result, message: 'Progression recalculée.' });
  } catch (err) {
    const status = err.message?.includes('non trouvé') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

module.exports = { getUserLevelProgress, getUserSubThemeProgress, getNextRecommended, recalculateModule };
