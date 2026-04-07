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

/**
 * @swagger
 * /api/v1/step-quizzes/{quizId}/submit:
 *   post:
 *     summary: Soumettre et valider les réponses d'un quiz
 *     description: Valide les réponses d'un quiz, calcule le score, met à jour la progression et attribue les récompenses (XP, coins)
 *     tags: [StepQuizzes]
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du quiz
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
 *                 description: Réponses de l'utilisateur (format JSON clé-valeur ou tableau)
 *                 example:
 *                   question_0: "A"
 *                   question_1: "B"
 *                   question_2: "C"
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
 *                       example: 90
 *                     passed:
 *                       type: boolean
 *                       description: true si score >= passingScore
 *                       example: true
 *                     correctAnswers:
 *                       type: integer
 *                       description: Nombre de bonnes réponses
 *                       example: 9
 *                     totalQuestions:
 *                       type: integer
 *                       description: Nombre total de questions
 *                       example: 10
 *                     passingScore:
 *                       type: integer
 *                       description: Score minimum requis pour réussir
 *                       example: 70
 *                     feedback:
 *                       type: array
 *                       description: Feedback détaillé par question
 *                       items:
 *                         type: object
 *                         properties:
 *                           questionIndex:
 *                             type: integer
 *                           question:
 *                             type: string
 *                           correct:
 *                             type: boolean
 *                           userAnswer:
 *                             type: string
 *                           correctAnswer:
 *                             type: string
 *                             nullable: true
 *                             description: Affiché uniquement si la réponse est incorrecte
 *                           explanation:
 *                             type: string
 *                             nullable: true
 *                     rewards:
 *                       type: object
 *                       properties:
 *                         xp:
 *                           type: integer
 *                           description: Points d'expérience gagnés
 *                           example: 50
 *                         coins:
 *                           type: integer
 *                           description: Pièces gagnées
 *                           example: 25
 *                     attemptsUsed:
 *                       type: integer
 *                       description: Nombre de tentatives utilisées
 *                       example: 1
 *                     attemptsRemaining:
 *                       type: integer
 *                       description: Nombre de tentatives restantes
 *                       example: 1
 *                     timeTaken:
 *                       type: string
 *                       nullable: true
 *                       description: Temps limite du quiz
 *       400:
 *         description: Données invalides ou nombre maximum de tentatives atteint
 *       404:
 *         description: Quiz non trouvé
 */
router.post('/:quizId/submit', controller.submitQuiz);

module.exports = router;
