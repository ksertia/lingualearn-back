const express = require('express');
const controller = require('./exercise.controller');
const router = express.Router();

/**
 * @swagger
 * /api/v1/exercises:
 *   post:
 *     summary: Créer un nouvel exercice
 *     tags: [Exercises]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lessonId
 *               - title
 *               - exerciseType
 *               - content
 *             properties:
 *               lessonId:
 *                 type: string
 *               title:
 *                 type: string
 *               exerciseType:
 *                 type: string
 *                 enum: [multiple_choice, fill_blank, matching]
 *               instructions:
 *                 type: string
 *               content:
 *                 type: object
 *               correctAnswers:
 *                 type: object
 *               hints:
 *                 type: object
 *               explanation:
 *                 type: string
 *               points:
 *                 type: integer
 *               xpReward:
 *                 type: integer
 *               coinReward:
 *                 type: integer
 *               maxAttempts:
 *                 type: integer
 *               timeLimitSeconds:
 *                 type: integer
 *               sortOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Exercice créé avec succès
 *       400:
 *         description: Données invalides
 */

/**
 * @swagger
 * /api/v1/exercises/{id}:
 *   get:
 *     summary: Récupérer un exercice par ID
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exercice trouvé
 *       404:
 *         description: Exercice non trouvé
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/exercises/{id}:
 *   put:
 *     summary: Modifier un exercice
 *     tags: [Exercises]
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
 *             $ref: '#/components/schemas/Exercise'
 *     responses:
 *       200:
 *         description: Exercice modifié
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Exercice non trouvé
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/v1/exercises/{id}:
 *   delete:
 *     summary: Supprimer un exercice
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Exercice supprimé
 *       404:
 *         description: Exercice non trouvé
 */
router.delete('/:id', controller.remove);

router.post('/', controller.create);

module.exports = router;
