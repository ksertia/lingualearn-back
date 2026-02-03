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
 * /api/v1/users/{userId}/steps/{stepId}/select:
 *   post:
 *     summary: Sélectionner une étape pour un utilisateur
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
 *       201:
 *         description: Progression créée ou existante
 */
router.post('/api/v1/users/:userId/steps/:stepId/select', controller.selectStep);

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

module.exports = router;
