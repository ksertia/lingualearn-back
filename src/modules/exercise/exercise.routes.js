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

/**
 * @swagger
 * /api/v1/exercises/{exerciseId}/submit:
 *   post:
 *     summary: Soumettre et valider les réponses d'un exercice
 *     description: Valide les réponses d'un exercice, calcule le score, met à jour la progression et attribue les récompenses (XP, coins)
 *     tags: [Exercises]
 *     parameters:
 *       - in: path
 *         name: exerciseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'exercice
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - answers
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *                 example: "user123"
 *               answers:
 *                 type: object
 *                 description: Réponses de l'utilisateur (format JSON clé-valeur)
 *                 example:
 *                   question1: "réponse A"
 *                   question2: "réponse B"
 *                   question3: ["option1", "option2"]
 *     responses:
 *       200:
 *         description: Réponses validées avec succès
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
 *                     attemptId:
 *                       type: string
 *                       description: ID de la tentative enregistrée
 *                     score:
 *                       type: integer
 *                       description: Score en pourcentage (0-100)
 *                       example: 85
 *                     passed:
 *                       type: boolean
 *                       description: true si score >= 70%
 *                       example: true
 *                     correctAnswers:
 *                       type: integer
 *                       description: Nombre de bonnes réponses
 *                       example: 17
 *                     totalQuestions:
 *                       type: integer
 *                       description: Nombre total de questions
 *                       example: 20
 *                     feedback:
 *                       type: object
 *                       description: Feedback détaillé par question
 *                       additionalProperties:
 *                         type: object
 *                         properties:
 *                           correct:
 *                             type: boolean
 *                           userAnswer:
 *                             type: string
 *                           correctAnswer:
 *                             type: string
 *                             nullable: true
 *                             description: Affiché uniquement si la réponse est incorrecte
 *                     rewards:
 *                       type: object
 *                       properties:
 *                         xp:
 *                           type: integer
 *                           description: Points d'expérience gagnés
 *                           example: 20
 *                         coins:
 *                           type: integer
 *                           description: Pièces gagnées
 *                           example: 10
 *                     attemptsUsed:
 *                       type: integer
 *                       description: Nombre de tentatives utilisées
 *                       example: 1
 *                     attemptsRemaining:
 *                       type: integer
 *                       description: Nombre de tentatives restantes
 *                       example: 2
 *                     explanation:
 *                       type: string
 *                       description: Explication détaillée de l'exercice
 *                       nullable: true
 *       400:
 *         description: Données invalides ou nombre maximum de tentatives atteint
 *       404:
 *         description: Exercice non trouvé
 */
router.post('/:exerciseId/submit', controller.submitAnswer);

module.exports = router;
