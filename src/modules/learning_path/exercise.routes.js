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
router.post('/', controller.create);

module.exports = router;
