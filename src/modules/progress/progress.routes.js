const express = require('express');
const controller = require('./progress.controller');
const { allowSelfOrRoles } = require('../../middleware/authMiddleware');
const router = express.Router();

// authMiddleware + requireSubscription déjà appliqués au montage
// (router.use('/progress', authMiddleware, requireSubscription, ...) dans src/routes/index.js).
// allowSelfOrRoles empêche un utilisateur authentifié quelconque de lire/recalculer la
// progression d'un autre userId que le sien (sauf admin/plateform_manager).
const selfOrAdmin = allowSelfOrRoles('userId', 'admin', 'plateform_manager');

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: |
 *     Suivi de progression informatif — aucun blocage. Le pourcentage indique
 *     simplement l'avancement de l'utilisateur, sans jamais restreindre l'accès.
 */

/**
 * @swagger
 * /api/v1/progress/user/{userId}/level/{levelId}:
 *   get:
 *     summary: Progression d'un utilisateur pour un niveau (par thème)
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Résumé de progression
 */
router.get('/user/:userId/level/:levelId', selfOrAdmin, controller.getUserLevelProgress);

/**
 * @swagger
 * /api/v1/progress/user/{userId}/sub-theme/{subThemeId}:
 *   get:
 *     summary: Progression d'un utilisateur pour un sous-thème
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: subThemeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Détail de progression
 */
router.get('/user/:userId/sub-theme/:subThemeId', selfOrAdmin, controller.getUserSubThemeProgress);

/**
 * @swagger
 * /api/v1/progress/user/{userId}/level/{levelId}/next:
 *   get:
 *     summary: Suggère la prochaine étape (sous-thème) à faire pour cet utilisateur
 *     description: |
 *       Purement indicatif — aucun blocage. Retourne le premier sous-thème actif
 *       (dans l'ordre Thème > Sous-thème) dont la progression est
 *       inférieure à 100%. L'utilisateur reste libre d'accéder à n'importe
 *       quel autre sous-thème, cette route sert uniquement à guider
 *       l'affichage d'une carte "Continuer avec...".
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sous-thème recommandé, ou subTheme null si le niveau est terminé
 *       404:
 *         description: Niveau non trouvé
 */
router.get('/user/:userId/level/:levelId/next', selfOrAdmin, controller.getNextRecommended);

/**
 * @swagger
 * /api/v1/progress/user/{userId}/level/{levelId}/recalculate:
 *   post:
 *     summary: Forcer le recalcul de la progression d'un niveau (moyenne de ses thèmes)
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progression recalculée
 */
router.post('/user/:userId/level/:levelId/recalculate', selfOrAdmin, controller.recalculateLevel);

module.exports = router;
