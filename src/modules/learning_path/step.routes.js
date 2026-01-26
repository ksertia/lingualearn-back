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
 * /api/v1/steps:
 *   post:
 *     summary: Créer une nouvelle étape
 *     tags: [Steps]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - stepNumber
 *               - levelId
 *             properties:
 *               title:
 *                 type: string
 *               stepNumber:
 *                 type: integer
 *               levelId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Étape créée
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/steps:
 *   get:
 *     summary: Récupérer toutes les étapes
 *     tags: [Steps]
 *     responses:
 *       200:
 *         description: Liste des étapes
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/v1/steps/{id}:
 *   get:
 *     summary: Récupérer une étape par ID
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
 * /api/v1/steps/{id}:
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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               stepNumber:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Étape mise à jour
 *       400:
 *         description: Données invalides
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
 *       204:
 *         description: Étape supprimée
 *       404:
 *         description: Étape non trouvée
 */
router.delete('/:id', controller.remove);

module.exports = router;
