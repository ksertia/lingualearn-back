const express = require('express');
const controller = require('./gamification.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Gamification
 *   description: Gestion des badges et récompenses
 */

/**
 * @swagger
 * /api/v1/gamification/badges:
 *   post:
 *     summary: Créer un badge
 *     tags: [Gamification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - badgeCode
 *               - badgeName
 *             properties:
 *               badgeCode:
 *                 type: string
 *               badgeName:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *               colorCode:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Badge créé
 *       400:
 *         description: Données invalides
 */
router.post('/badges', controller.createBadge);

/**
 * @swagger
 * /api/v1/gamification/badges:
 *   get:
 *     summary: Récupérer tous les badges
 *     tags: [Gamification]
 *     responses:
 *       200:
 *         description: Liste des badges
 */
router.get('/badges', controller.getAllBadges);

/**
 * @swagger
 * /api/v1/gamification/badges/{id}:
 *   get:
 *     summary: Récupérer un badge par ID
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Badge trouvé
 *       404:
 *         description: Badge non trouvé
 */
router.get('/badges/:id', controller.getBadgeById);

/**
 * @swagger
 * /api/v1/gamification/badges/{id}:
 *   put:
 *     summary: Modifier un badge
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               badgeCode:
 *                 type: string
 *               badgeName:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *               colorCode:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Badge modifié
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Badge non trouvé
 */
router.put('/badges/:id', controller.updateBadge);

/**
 * @swagger
 * /api/v1/gamification/badges/{id}:
 *   delete:
 *     summary: Supprimer un badge
 *     tags: [Gamification]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Badge supprimé
 *       404:
 *         description: Badge non trouvé
 */
router.delete('/badges/:id', controller.deleteBadge);

/**
 * @swagger
 * /api/v1/gamification/user-badges:
 *   post:
 *     summary: Attribuer un badge à un utilisateur
 *     tags: [Gamification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - badgeId
 *             properties:
 *               userId:
 *                 type: string
 *               badgeId:
 *                 type: string
 *               awardedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Badge attribué
 *       400:
 *         description: Données invalides
 */
router.post('/user-badges', controller.awardBadgeToUser);

/**
 * @swagger
 * /api/v1/gamification/user-badges/{userId}:
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
 *         description: Liste des badges utilisateur
 */
router.get('/user-badges/:userId', controller.getUserBadges);

module.exports = router;
