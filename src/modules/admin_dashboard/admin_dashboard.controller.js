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

module.exports = {
  getDashboard,
};
