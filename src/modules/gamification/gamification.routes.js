const express = require('express');
const controller = require('./gamification.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Gamification
 *   description: Système de gamification complet (XP, coins, badges, streaks, leaderboard)
 */

/**
 * @swagger
 * /api/v1/gamification/users/{userId}/stats:
 *   get:
 *     summary: Récupérer les statistiques complètes d'un utilisateur
 *     description: Retourne les stats de gamification incluant niveau, XP, coins, streaks, badges
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Statistiques de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     level:
 *                       type: integer
 *                       example: 5
 *                     totalXp:
 *                       type: integer
 *                       example: 1650
 *                     xpForNextLevel:
 *                       type: integer
 *                       example: 2500
 *                     xpProgress:
 *                       type: integer
 *                       example: 250
 *                     xpNeeded:
 *                       type: integer
 *                       example: 900
 *                     progressPercentage:
 *                       type: integer
 *                       example: 28
 *                     totalCoins:
 *                       type: integer
 *                       example: 425
 *                     currentStreak:
 *                       type: integer
 *                       example: 12
 *                     longestStreak:
 *                       type: integer
 *                       example: 15
 *                     totalLessonsCompleted:
 *                       type: integer
 *                     totalExercisesCompleted:
 *                       type: integer
 *                     totalStepsCompleted:
 *                       type: integer
 *                     accuracyRate:
 *                       type: number
 *                       format: float
 *                     badges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           icon:
 *                             type: string
 *                           earnedAt:
 *                             type: string
 *                             format: date-time
 *                     totalBadges:
 *                       type: integer
 */
router.get('/users/:userId/stats', controller.getUserStats);

/**
 * @swagger
 * /api/v1/gamification/users/{userId}/rewards:
 *   post:
 *     summary: Ajouter des récompenses à un utilisateur
 *     description: Ajoute de l'XP et des coins à un utilisateur et vérifie les nouveaux badges
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               xp:
 *                 type: integer
 *                 example: 20
 *               coins:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       200:
 *         description: Récompenses ajoutées
 */
router.post('/users/:userId/rewards', controller.addRewards);

/**
 * @swagger
 * /api/v1/gamification/badges:
 *   get:
 *     summary: Récupérer tous les badges disponibles
 *     tags: [Gamification]
 *     responses:
 *       200:
 *         description: Liste de tous les badges
 */
router.get('/badges', controller.getAllBadges);

/**
 * @swagger
 * /api/v1/gamification/users/{userId}/badges:
 *   get:
 *     summary: Récupérer les badges d'un utilisateur
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Badges de l'utilisateur
 */
router.get('/users/:userId/badges', controller.getUserBadges);

/**
 * @swagger
 * /api/v1/gamification/users/{userId}/badges/check:
 *   post:
 *     summary: Vérifier et attribuer les badges débloqués
 *     description: Vérifie les conditions et attribue automatiquement les nouveaux badges
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Badges vérifiés
 */
router.post('/users/:userId/badges/check', controller.checkBadges);

/**
 * @swagger
 * /api/v1/gamification/users/{userId}/streak:
 *   post:
 *     summary: Mettre à jour le streak quotidien
 *     description: Enregistre l'activité du jour et met à jour le streak
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Streak mis à jour
 */
router.post('/users/:userId/streak', controller.updateStreak);

/**
 * @swagger
 * /api/v1/gamification/leaderboard:
 *   get:
 *     summary: Récupérer le classement global
 *     description: Retourne le top des utilisateurs par XP
 *     tags: [Gamification]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre d'utilisateurs à retourner
 *     responses:
 *       200:
 *         description: Classement des utilisateurs
 */
router.get('/leaderboard', controller.getLeaderboard);

/**
 * @swagger
 * /api/v1/gamification/users/{userId}/rank:
 *   get:
 *     summary: Récupérer le rang d'un utilisateur
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rang de l'utilisateur
 */
router.get('/users/:userId/rank', controller.getUserRank);

module.exports = router;
