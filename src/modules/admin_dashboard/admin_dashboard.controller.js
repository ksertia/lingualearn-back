// ============================================================================
// OPTION A: DASHBOARD CONTROLLERS
// ============================================================================

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
const service = require('./admin_dashboard.service');

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Statistiques globales de la plateforme
 *     tags: [AdminDashboard]
 *     responses:
 *       200:
 *         description: Statistiques de la plateforme
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         verified:
 *                           type: integer
 *                         admin:
 *                           type: integer
 *                         subAccounts:
 *                           type: integer
 *                         withSubscription:
 *                           type: integer
 *                     learningPaths:
 *                       type: integer
 *                     levels:
 *                       type: integer
 *                     steps:
 *                       type: integer
 *                     lessons:
 *                       type: integer
 *                     exercises:
 *                       type: integer
 *                     stepQuizzes:
 *                       type: integer
 *       500:
 *         description: Erreur serveur
 */
const { dashboardFilterSchema } = require('./admin_dashboard.schema');

const getDashboard = async (req, res) => {
  try {
    const { error, value } = dashboardFilterSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const stats = await service.getDashboardStats(value);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }

};

// Total utilisateurs
const getTotalUsers = async (req, res) => {
  try {
    const { error, value } = dashboardFilterSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }
    const total = await service.getTotalUsers(value); // ← value avec types convertis
    res.status(200).json({ success: true, data: { total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Total parcours – pas de filtres, pas besoin de validation
const getTotalLearningPaths = async (req, res) => {
  try {
    const total = await service.getTotalLearningPaths();
    res.status(200).json({ success: true, data: { total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Total étapes
const getTotalSteps = async (req, res) => {
  try {
    const total = await service.getTotalSteps();
    res.status(200).json({ success: true, data: { total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Total leçons
const getTotalLessons = async (req, res) => {
  try {
    const total = await service.getTotalLessons();
    res.status(200).json({ success: true, data: { total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Total quiz
const getTotalQuizzes = async (req, res) => {
  try {
    const total = await service.getTotalStepQuizzes();
    res.status(200).json({ success: true, data: { total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Total niveaux (optionnel)
const getTotalLevels = async (req, res) => {
  try {
    const total = await service.getTotalLevels();
    res.status(200).json({ success: true, data: { total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  getTotalUsers,
  getTotalLearningPaths,
  getTotalSteps,
  getTotalLessons,
  getTotalQuizzes,
  getTotalLevels
};
