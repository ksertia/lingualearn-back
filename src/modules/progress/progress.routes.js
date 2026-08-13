const express = require('express');
const controller = require('./progress.controller');
const router = express.Router();

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
 *     summary: Progression d'un utilisateur pour un niveau (par module)
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
router.get('/user/:userId/level/:levelId', controller.getUserLevelProgress);

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
router.get('/user/:userId/sub-theme/:subThemeId', controller.getUserSubThemeProgress);

/**
 * @swagger
 * /api/v1/progress/user/{userId}/level/{levelId}/next:
 *   get:
 *     summary: Suggère la prochaine étape (sous-thème) à faire pour cet utilisateur
 *     description: |
 *       Purement indicatif — aucun blocage. Retourne le premier sous-thème actif
 *       (dans l'ordre Module > Thème > Sous-thème) dont la progression est
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
router.get('/user/:userId/level/:levelId/next', controller.getNextRecommended);

/**
 * @swagger
 * /api/v1/progress/user/{userId}/module/{moduleId}/recalculate:
 *   post:
 *     summary: Forcer le recalcul de la progression d'un module (et du niveau associé)
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progression recalculée
 */
router.post('/user/:userId/module/:moduleId/recalculate', controller.recalculateModule);

module.exports = router;
