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
router.post('/', controller.create);

module.exports = router;
