const express = require('express');
const controller = require('./step-quizzes.controller');
const router = express.Router();

/**
 * @swagger
 * /api/v1/step-quizzes:
 *   post:
 *     summary: Créer un nouveau quiz d'étape
 *     tags: [StepQuizzes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stepId
 *               - title
 *               - questions
 *             properties:
 *               stepId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *               passingScore:
 *                 type: integer
 *               maxAttempts:
 *                 type: integer
 *               timeLimitMinutes:
 *                 type: integer
 *               xpReward:
 *                 type: integer
 *               coinReward:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Quiz créé avec succès
 *       400:
 *         description: Données invalides
 */

/**
 * @swagger
 * /api/v1/step-quizzes/{id}:
 *   get:
 *     summary: Récupérer un quiz d'étape par ID
 *     tags: [StepQuizzes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz trouvé
 *       404:
 *         description: Quiz non trouvé
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/step-quizzes/{id}:
 *   put:
 *     summary: Modifier un quiz d'étape
 *     tags: [StepQuizzes]
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
 *             $ref: '#/components/schemas/StepQuiz'
 *     responses:
 *       200:
 *         description: Quiz modifié
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Quiz non trouvé
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/v1/step-quizzes/{id}:
 *   delete:
 *     summary: Supprimer un quiz d'étape
 *     tags: [StepQuizzes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Quiz supprimé
 *       404:
 *         description: Quiz non trouvé
 */
router.delete('/:id', controller.remove);

router.post('/', controller.create);

module.exports = router;
