const express = require('express');
const controller = require('./admin_dashboard.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AdminDashboard
 *   description: Statistiques et état global de la plateforme
 */


/**
 * @swagger
 * /admin/dashboard:
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

module.exports = router;
