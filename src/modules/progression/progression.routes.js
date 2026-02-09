const express = require('express');
const router = express.Router();
const progressionController = require('./progression.controller');

/**
 * @swagger
 * tags:
 *   name: Progression
 *   description: Gestion de la progression utilisateur - déblocage automatique, complétion, statistiques
 */

/**
 * @swagger
 * /api/v1/progression/initialize:
 *   post:
 *     tags: [Progression]
 *     summary: Initialiser la progression d'un utilisateur sur une langue
 *     description: Débloque automatiquement le premier niveau, module, parcours et étape
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProgressionInit'
 *     responses:
 *       201:
 *         description: Progression initialisée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/initialize', progressionController.initializeProgression);

/**
 * @swagger
 * /api/v1/progression/complete/step:
 *   post:
 *     tags: [Progression]
 *     summary: Compléter une étape et débloquer la suivante
 *     description: Marque l'étape comme complétée et débloque automatiquement l'étape suivante
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteStep'
 *     responses:
 *       200:
 *         description: Étape complétée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/complete/step', progressionController.completeStep);

/**
 * @swagger
 * /api/v1/progression/complete/path:
 *   post:
 *     tags: [Progression]
 *     summary: Compléter un parcours et débloquer le suivant
 *     description: Marque le parcours comme complété et débloque automatiquement le parcours suivant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompletePath'
 *     responses:
 *       200:
 *         description: Parcours complété avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/complete/path', progressionController.completePath);

/**
 * @swagger
 * /api/v1/progression/complete/module:
 *   post:
 *     tags: [Progression]
 *     summary: Compléter un module et débloquer le suivant
 *     description: Marque le module comme complété et débloque automatiquement le module suivant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteModule'
 *     responses:
 *       200:
 *         description: Module complété avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/complete/module', progressionController.completeModule);

/**
 * @swagger
 * /api/v1/progression/complete/level:
 *   post:
 *     tags: [Progression]
 *     summary: Compléter un niveau et débloquer le suivant
 *     description: Marque le niveau comme complété et débloque automatiquement le niveau suivant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteLevel'
 *     responses:
 *       200:
 *         description: Niveau complété avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/complete/level', progressionController.completeLevel);

/**
 * @swagger
 * /api/v1/progression/user/{userId}/language/{languageId}:
 *   get:
 *     tags: [Progression]
 *     summary: Récupérer la progression d'un utilisateur
 *     description: Retourne la progression de base d'un utilisateur sur une langue
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       200:
 *         description: Progression récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Progression non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/user/:userId/language/:languageId', progressionController.getUserProgression);

/**
 * @swagger
 * /api/v1/progression/complete/{userId}/{languageId}:
 *   get:
 *     tags: [Progression]
 *     summary: Récupérer la progression complète et structurée
 *     description: Retourne la progression hiérarchique complète avec tous les niveaux, modules, parcours et étapes
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       200:
 *         description: Progression complète récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CompleteProgression'
 *       404:
 *         description: Progression non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/complete/:userId/:languageId', progressionController.getCompleteProgression);

/**
 * @swagger
 * /api/v1/progression/stats/{userId}/{languageId}:
 *   get:
 *     tags: [Progression]
 *     summary: Récupérer les statistiques de progression
 *     description: Retourne les statistiques détaillées de progression d'un utilisateur
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ProgressionStats'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats/:userId/:languageId', progressionController.getProgressionStats);

/**
 * @swagger
 * /api/v1/progression/next/{userId}/{languageId}:
 *   get:
 *     tags: [Progression]
 *     summary: Récupérer les prochains éléments à compléter
 *     description: Retourne les prochains éléments que l'utilisateur doit compléter dans sa progression
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       200:
 *         description: Prochains éléments récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NextElement'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/next/:userId/:languageId', progressionController.getNextElements);

/**
 * @swagger
 * /api/v1/progression/check/{userId}/{elementType}/{elementId}:
 *   get:
 *     tags: [Progression]
 *     summary: Vérifier si un utilisateur peut accéder à un élément
 *     description: Vérifie les droits d'accès d'un utilisateur à un élément spécifique
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: elementType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [level, module, path, step]
 *         description: Type de l'élément
 *       - in: path
 *         name: elementId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'élément
 *     responses:
 *       200:
 *         description: Vérification d'accès effectuée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AccessCheck'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/check/:userId/:elementType/:elementId', progressionController.checkAccess);

/**
 * @swagger
 * /api/v1/progression/unlock:
 *   post:
 *     tags: [Progression]
 *     summary: Débloquer manuellement un élément (admin)
 *     description: Permet de débloquer manuellement un élément pour un utilisateur (réservé admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnlockElement'
 *     responses:
 *       200:
 *         description: Élément débloqué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/unlock', progressionController.unlockElement);

/**
 * @swagger
 * /api/v1/progression/recalculate/{userId}/{languageId}:
 *   post:
 *     tags: [Progression]
 *     summary: Recalculer les pourcentages de progression
 *     description: Recalcule et met à jour tous les pourcentages de progression pour un utilisateur
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       200:
 *         description: Progression recalculée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/recalculate/:userId/:languageId', progressionController.recalculateProgress);

module.exports = router;
