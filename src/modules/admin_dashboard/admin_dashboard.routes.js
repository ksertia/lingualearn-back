const express = require('express');
const controller = require('./admin_dashboard.controller');
const router = express.Router();
const { authMiddleware, allowRoles } = require('../../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: AdminDashboard
 *   description: Statistiques et état global de la plateforme
 */


/**
 * @swagger
 * api/v1/admin/dashboard:
 *   get:
 *     summary: Récupère les statistiques globales de l'application
 *     tags: [AdminDashboard]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de début pour filtrer les utilisateurs (ISO)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Date de fin pour filtrer les utilisateurs (ISO)
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [admin, user, sub_account]
 *         description: Type de compte utilisateur à filtrer
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrer par utilisateurs actifs
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filtrer par utilisateurs vérifiés
 *       - in: query
 *         name: withSubscription
 *         schema:
 *           type: boolean
 *         description: Filtrer les utilisateurs ayant un abonnement
 *     responses:
 *       200:
 *         description: Statistiques globales
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
 */
router.get('/dashboard', controller.getDashboard);


/**
 * @swagger
 * /api/v1/admin/stats/users/total:
 *   get:
 *     summary: Nombre total d'utilisateurs
 *     tags: [AdminDashboard]
 *     parameters:
 *       - in: query
 *         name: userType
 *         schema: { type: string, enum: [admin, user, sub_account] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: isVerified
 *         schema: { type: boolean }
 *       - in: query
 *         name: withSubscription
 *         schema: { type: boolean }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Nombre total d'utilisateurs
 */
router.get(
  '/stats/users/total',
  authMiddleware,
  allowRoles('admin'),
  controller.getTotalUsers
);

/**
 * @swagger
 * /api/v1/admin/stats/learning-paths/total:
 *   get:
 *     summary: Nombre total de parcours créés
 *     tags: [AdminDashboard]
 *     responses:
 *       200:
 *         description: Nombre total de parcours
 */
router.get(
  '/stats/learning-paths/total',
  authMiddleware,
  allowRoles('admin'),
  controller.getTotalLearningPaths
);

/**
 * @swagger
 * /api/v1/admin/stats/steps/total:
 *   get:
 *     summary: Nombre total d'étapes
 *     tags: [AdminDashboard]
 *     responses:
 *       200:
 *         description: Nombre total d'étapes
 */
router.get(
  '/stats/steps/total',
  authMiddleware,
  allowRoles('admin'),
  controller.getTotalSteps
);

/**
 * @swagger
 * /api/v1/admin/stats/lessons/total:
 *   get:
 *     summary: Nombre total de leçons
 *     tags: [AdminDashboard]
 *     responses:
 *       200:
 *         description: Nombre total de leçons
 */
router.get(
  '/stats/lessons/total',
  authMiddleware,
  allowRoles('admin'),
  controller.getTotalLessons
);

/**
 * @swagger
 * /api/v1/admin/stats/quizzes/total:
 *   get:
 *     summary: Nombre total de quiz (stepQuizzes)
 *     tags: [AdminDashboard]
 *     responses:
 *       200:
 *         description: Nombre total de quiz
 */
router.get(
  '/stats/quizzes/total',
  authMiddleware,
  allowRoles('admin'),
  controller.getTotalQuizzes
);

// Optionnel : total des niveaux
/**
 * @swagger
 * /api/v1/admin/stats/levels/total:
 *   get:
 *     summary: Nombre total de niveaux
 *     tags: [AdminDashboard]
 *     responses:
 *       200:
 *         description: Nombre total de niveaux
 */
router.get(
  '/stats/levels/total',
  authMiddleware,
  allowRoles('admin'),
  controller.getTotalLevels
);

module.exports = router;
