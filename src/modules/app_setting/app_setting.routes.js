const express = require('express');
const router = express.Router();
const { authMiddleware, allowRoles } = require('../../middleware/authMiddleware');
const controller = require('./app_setting.controller');

const adminOnly = [authMiddleware, allowRoles('admin', 'plateform_manager')];

/**
 * @swagger
 * tags:
 *   name: AppSettings
 *   description: Paramètres globaux de la plateforme (admin)
 */

/**
 * @swagger
 * /api/v1/admin/settings:
 *   get:
 *     summary: Lire tous les paramètres globaux
 *     tags: [AppSettings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des paramètres
 */
router.get('/settings', ...adminOnly, controller.getSettings);

/**
 * @swagger
 * /api/v1/admin/settings/{key}:
 *   get:
 *     summary: Lire un paramètre par sa clé
 *     tags: [AppSettings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         example: trial_duration_days
 *     responses:
 *       200:
 *         description: Valeur du paramètre
 *       404:
 *         description: Paramètre introuvable
 */
router.get('/settings/:key', ...adminOnly, controller.getSettingByKey);

/**
 * @swagger
 * /api/v1/admin/settings/{key}:
 *   patch:
 *     summary: Modifier un paramètre global
 *     tags: [AppSettings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         example: trial_duration_days
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *                 example: "7"
 *     responses:
 *       200:
 *         description: Paramètre mis à jour
 */
router.patch('/settings/:key', ...adminOnly, controller.updateSetting);

/**
 * @swagger
 * /api/v1/admin/users/{id}/trial:
 *   patch:
 *     summary: Ajuster manuellement la date d'expiration du trial d'un learner
 *     tags: [AppSettings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur learner
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [expiresAt]
 *             properties:
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-15T00:00:00.000Z"
 *     responses:
 *       200:
 *         description: Trial mis à jour
 *       400:
 *         description: Date invalide ou type de compte non supporté
 *       404:
 *         description: Utilisateur introuvable
 */
router.patch('/users/:id/trial', ...adminOnly, controller.adjustUserTrial);

module.exports = router;
