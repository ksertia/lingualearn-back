
const express = require('express');
const router = express.Router();
const evaluationController = require('./evaluation.controller');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../../config/prisma');


/**
 * @swagger
 * /api/v1/evaluation/discovery-session:
 *   get:
 *     tags:
 *       - Evaluation
 *     summary: Obtenir ou générer un identifiant de session découverte
 *     description: Retourne un id de session découverte à utiliser pour soumettre et récupérer les résultats d'évaluation en mode découverte. Si un id est déjà fourni (query ?sessionId=...), il est réutilisé, sinon un nouveau est généré. Expire automatiquement après 24h.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         required: false
 *         description: SessionId existant à réutiliser (optionnel)
 *     responses:
 *       200:
 *         description: Identifiant de session généré ou existant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   example: "d7b8c2e0-1234-4f8a-9b2e-abcdef123456"
 */
router.get('/discovery-session', async (req, res, next) => {
	try {
		let sessionId = req.query.sessionId;
		let session;
		if (sessionId) {
			session = await prisma.discoverySession.findUnique({ where: { id: sessionId } });
		}
		if (!session) {
			sessionId = uuidv4();
			const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
			await prisma.discoverySession.create({ data: { id: sessionId, expiresAt } });
		}
		res.status(200).json({ sessionId });
	} catch (err) {
		next(err);
	}
});


/**
 * @swagger
 * /api/v1/evaluation:
 *   post:
 *     tags:
 *       - Evaluation
 *     summary: Soumettre un résultat d'évaluation
 *     description: Permet de soumettre le score et le feedback d'un utilisateur (userId) ou d'une session découverte (sessionId) pour une langue donnée.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               languageId:
 *                 type: string
 *                 example: clq1x2abc0000v2l3k9x9x9x9
 *               userId:
 *                 type: string
 *                 example: clq1x2abc0000v2l3k9x9x9x9
 *                 description: "Optionnel. Si absent, utiliser sessionId."
 *               sessionId:
 *                 type: string
 *                 example: d7b8c2e0-1234-4f8a-9b2e-abcdef123456
 *                 description: "Optionnel. Pour la découverte anonyme."
 *               score:
 *                 type: number
 *                 example: 85
 *               feedback:
 *                 type: string
 *                 example: "Bon début, à approfondir."
 *               details:
 *                 type: object
 *                 example: { "questions": ["Q1", "Q2"], "answers": ["A", "B"] }
 *     responses:
 *       201:
 *         description: Résultat d'évaluation enregistré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 userId:
 *                   type: string
 *                   nullable: true
 *                 sessionId:
 *                   type: string
 *                   nullable: true
 *                 languageId:
 *                   type: string
 *                 score:
 *                   type: number
 *                 feedback:
 *                   type: string
 *                 details:
 *                   type: object
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 */
router.post('/', evaluationController.submitEvaluation);


/**
 * @swagger
 * /api/v1/evaluation/{id}:
 *   get:
 *     tags:
 *       - Evaluation
 *     summary: Récupérer les résultats d'évaluation d'un utilisateur ou d'une session découverte
 *     description: Retourne tous les résultats d'évaluation pour un utilisateur (userId) ou une session découverte (sessionId).
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: userId (connecté) ou sessionId (découverte)
 *     responses:
 *       200:
 *         description: Liste des résultats d'évaluation
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                     nullable: true
 *                   sessionId:
 *                     type: string
 *                     nullable: true
 *                   languageId:
 *                     type: string
 *                   score:
 *                     type: number
 *                   feedback:
 *                     type: string
 *                   details:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   language:
 *                     $ref: '#/components/schemas/Language'
 */
router.get('/:id', evaluationController.getUserEvaluations);

module.exports = router;
