/**
 * @swagger
 * components:
 *   schemas:
 *     Step:
 *       type: object
 *       required:
 *         - levelId
 *         - title
 *         - description
 *         - stepNumber
 *       properties:
 *         levelId:
 *           type: string
 *           description: ID du niveau parent
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: Titre de l'étape
 *         description:
 *           type: string
 *           description: Description de l'étape
 *         stepNumber:
 *           type: integer
 *           description: Numéro de l'étape dans le niveau
 *         stepCode:
 *           type: string
 *           maxLength: 50
 *           nullable: true
 *         thumbnailUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         iconUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *         estimatedDurationHours:
 *           type: integer
 *           default: 1
 *         difficultyLevel:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           default: beginner
 *         isPublished:
 *           type: boolean
 *           default: false
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         sortOrder:
 *           type: integer
 *           description: Ordre d'affichage
 *         isActive:
 *           type: boolean
 *           default: true
 *       example:
 *         levelId: "clq1k2v7d0000v8y6g7z6k2v6"
 *         title: "Introduction à la grammaire"
 *         description: "Première étape du niveau débutant."
 *         stepNumber: 1
 */
// ...existing code...
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

module.exports = router;
