const express = require('express');
const controller = require('./sub-theme-evaluation.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Evaluations
 *   description: |
 *     Évaluation de fin de sous-thème (0 ou 1 par sous-thème). Distinct du module
 *     `/evaluation` (singulier) qui concerne le test de niveau à l'inscription (Discover).
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Evaluation:
 *       type: object
 *       properties:
 *         id:               { type: string }
 *         subThemeId:       { type: string }
 *         title:            { type: string }
 *         description:      { type: string, nullable: true }
 *         questions:        { type: array, items: { type: object } }
 *         passingScore:     { type: integer }
 *         maxAttempts:      { type: integer }
 *         timeLimitMinutes: { type: integer, nullable: true }
 *         isActive:         { type: boolean }
 *
 *     EvaluationCreate:
 *       type: object
 *       required: [subThemeId, title, questions]
 *       properties:
 *         subThemeId:       { type: string }
 *         title:            { type: string, maxLength: 200 }
 *         description:      { type: string, nullable: true }
 *         questions:
 *           type: array
 *           items: { type: object }
 *           example:
 *             - question: "Comment dit-on bonjour en Dioula ?"
 *               correctAnswer: "I ni ce"
 *               explanation: "I ni ce est la salutation standard."
 *         passingScore:     { type: integer, default: 70 }
 *         maxAttempts:      { type: integer, default: 3 }
 *         timeLimitMinutes: { type: integer, default: 15 }
 */

/**
 * @swagger
 * /api/v1/evaluations:
 *   post:
 *     summary: Créer une évaluation pour un sous-thème (max 1 par sous-thème)
 *     tags: [Evaluations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/EvaluationCreate' }
 *     responses:
 *       201:
 *         description: Évaluation créée
 *       409:
 *         description: Une évaluation existe déjà pour ce sous-thème
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/evaluations/sub-theme/{subThemeId}:
 *   get:
 *     summary: Récupérer l'évaluation d'un sous-thème
 *     tags: [Evaluations]
 *     parameters:
 *       - in: path
 *         name: subThemeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Évaluation (ou null si absente)
 */
router.get('/sub-theme/:subThemeId', controller.getBySubThemeId);

/**
 * @swagger
 * /api/v1/evaluations/{id}:
 *   get:
 *     summary: Récupérer une évaluation par ID
 *     tags: [Evaluations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Évaluation trouvée
 *       404:
 *         description: Évaluation non trouvée
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/evaluations/{id}:
 *   patch:
 *     summary: Modifier une évaluation
 *     tags: [Evaluations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Évaluation mise à jour
 */
router.patch('/:id', controller.update);

/**
 * @swagger
 * /api/v1/evaluations/{id}:
 *   delete:
 *     summary: Supprimer une évaluation
 *     tags: [Evaluations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Évaluation supprimée
 */
router.delete('/:id', controller.remove);

/**
 * @swagger
 * /api/v1/evaluations/{id}/submit:
 *   post:
 *     summary: Soumettre et valider les réponses d'une évaluation
 *     tags: [Evaluations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, answers]
 *             properties:
 *               userId:  { type: string, example: "user123" }
 *               answers: { type: object, example: { question_0: "A", question_1: "B" } }
 *     responses:
 *       200:
 *         description: Résultat de la soumission
 *       404:
 *         description: Évaluation non trouvée
 */
router.post('/:id/submit', controller.submit);

module.exports = router;
