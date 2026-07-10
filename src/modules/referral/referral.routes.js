const express = require('express');
const router = express.Router();
const controller = require('./referral.controller');
const { authMiddleware: authenticate } = require('../../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Referral
 *   description: Système de parrainage
 */

/**
 * @swagger
 * /api/v1/referral/my:
 *   get:
 *     summary: Mon code de parrainage + statistiques
 *     tags: [Referral]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Code + stats parrainage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     referralCode:      { type: string, example: "LL-ABC1XY2Z" }
 *                     totalFilleuls:     { type: integer }
 *                     totalRewarded:     { type: integer }
 *                     totalXpEarned:     { type: integer }
 *                     totalCoinsEarned:  { type: integer }
 *                     filleuls:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           username:   { type: string }
 *                           firstName:  { type: string }
 *                           status:     { type: string, enum: [pending, rewarded] }
 *                           joinedAt:   { type: string, format: date-time }
 *                           rewardedAt: { type: string, format: date-time, nullable: true }
 */
router.get('/my', authenticate, controller.getMyReferral);

/**
 * @swagger
 * /api/v1/referral/apply:
 *   post:
 *     summary: Appliquer un code de parrainage
 *     tags: [Referral]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: "LL-ABC1XY2Z"
 *     responses:
 *       200:
 *         description: Code appliqué, XP de bienvenue attribués
 *       400:
 *         description: Code invalide ou déjà utilisé
 */
router.post('/apply', authenticate, controller.applyCode);

module.exports = router;
