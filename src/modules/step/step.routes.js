/**
 * @swagger
 * components:
 *   schemas:
 *     Step:
 *       type: object
 *       required:
 *         - pathId
 *         - title
 *         - stepType
 *       properties:
 *         pathId:
 *           type: string
 *           description: ID du parcours parent
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Titre de l'étape
 *         description:
 *           type: string
 *           description: Description de l'étape
 *         stepType:
 *           type: string
 *           enum: [lesson, exercise, quiz]
 *           description: Type d'étape
 *         index:
 *           type: integer
 *           description: Ordre dans le parcours
 *         estimatedMinutes:
 *           type: integer
 *           default: 15
 *           description: Durée estimée (minutes)
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Statut d'activité
 *       example:
 *         pathId: "clq1k2v7d0000v8y6g7z6k2v6"
 *         title: "Introduction à la grammaire"
 *         description: "Première étape du parcours."
 *         stepType: "lesson"
 *         index: 0
 *         estimatedMinutes: 15
 *         isActive: true
 */
const express = require('express');
const controller = require('./step.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Steps
 *   description: Gestion des étapes (Step)
 */

/**
 * @swagger
 *  /api/v1/steps:
 *   get:
 *     summary: Liste toutes les étapes
 *     tags: [Steps]
 *     responses:
 *       200:
 *         description: Liste des étapes
 */
router.get('/', controller.getAll);

/**
 * @swagger
 *  /api/v1/steps:
 *   post:
 *     summary: Créer une étape
 *     tags: [Steps]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Step'
 *     responses:
 *       201:
 *         description: Étape créée
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/steps/{id}:
 *   get:
 *     summary: Obtenir une étape par ID
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Étape trouvée
 *       404:
 *         description: Étape non trouvée
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 *  /api/v1/steps/{id}:
 *   put:
 *     summary: Mettre à jour une étape
 *     tags: [Steps]
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
 *             $ref: '#/components/schemas/Step'
 *     responses:
 *       200:
 *         description: Étape mise à jour
 *       404:
 *         description: Étape non trouvée
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/v1/steps/{id}:
 *   delete:
 *     summary: Supprimer une étape
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Étape supprimée
 *       404:
 *         description: Étape non trouvée
 */
router.delete('/:id', controller.remove);

/**
 * @swagger
 * /api/v1/users/{userId}/steps:
 *   get:
 *     summary: Récupérer les étapes liées à un utilisateur
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des étapes liées à l'utilisateur
 *       404:
 *         description: Aucune étape trouvée pour cet utilisateur
 */
router.get('/api/v1/users/:userId/steps', controller.getByUserId);


/**
 * @swagger
 * /api/v1/users/{userId}/steps/{stepId}/start:
 *   post:
 *     summary: Démarrer une étape pour un utilisateur
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/steps/:stepId/start', controller.startStep);

/**
 * @swagger
 * /api/v1/users/{userId}/steps/{stepId}/complete:
 *   post:
 *     summary: Valider une étape pour un utilisateur
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/steps/:stepId/complete', controller.completeStep);

/**
 * @swagger
 * /api/v1/users/{userId}/paths/{pathId}/steps:
 *   get:
 *     summary: Récupérer les étapes d'un parcours spécifique pour un utilisateur
 *     tags: [Steps]
 *     description: Permet de récupérer toutes les étapes d'un parcours spécifique avec la progression de l'utilisateur, même si ce n'est pas le parcours actif
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du parcours dont on veut récupérer les étapes
 *     responses:
 *       200:
 *         description: Liste des étapes du parcours avec leur progression
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       index:
 *                         type: integer
 *                       pathId:
 *                         type: string
 *                       stepType:
 *                         type: string
 *                         enum: [lesson, exercise, quiz]
 *                       status:
 *                         type: string
 *                         enum: [locked, unlocked, started, completed]
 *                       progressValue:
 *                         type: integer
 *                       lesson:
 *                         type: object
 *                         nullable: true
 *                       exercise:
 *                         type: object
 *                         nullable: true
 *                       quiz:
 *                         type: object
 *                         nullable: true
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 */
router.get('/api/v1/users/:userId/paths/:pathId/steps', controller.getStepsByPathId);

/**
 * @swagger
 * /api/v1/steps/{stepId}/content:
 *   get:
 *     summary: Récupérer le contenu complet d'une étape (Lesson/Exercise/Quiz)
 *     description: Récupère le contenu détaillé d'une étape avec toutes les informations contextuelles (parcours, module, niveau, langue) et la progression utilisateur
 *     tags: [Steps]
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'étape
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel, pour récupérer la progression)
 *     responses:
 *       200:
 *         description: Contenu de l'étape récupéré avec succès
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
 *                     step:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         stepType:
 *                           type: string
 *                           enum: [lesson, exercise, quiz]
 *                         index:
 *                           type: integer
 *                         estimatedMinutes:
 *                           type: integer
 *                         isActive:
 *                           type: boolean
 *                     content:
 *                       type: object
 *                       description: Contenu selon le type (lesson/exercise/quiz)
 *                     contentType:
 *                       type: string
 *                       enum: [lesson, exercise, quiz]
 *                     path:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                     module:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                     level:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                     language:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                     userProgress:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [locked, started, completed]
 *                         progress:
 *                           type: integer
 *                         score:
 *                           type: integer
 *                           nullable: true
 *                         attempts:
 *                           type: integer
 *                         startedAt:
 *                           type: string
 *                           format: date-time
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *       404:
 *         description: Étape non trouvée
 */
router.get('/:stepId/content', controller.getStepContent);

module.exports = router;
