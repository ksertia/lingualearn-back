const express = require('express');
const controller = require('./transaction.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Historique des transactions financières
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: cltx123abc
 *         userId:
 *           type: string
 *           example: cluser123abc
 *         transactionType:
 *           type: string
 *           enum: [subscription_payment, refund, adjustment]
 *           example: subscription_payment
 *         amount:
 *           type: number
 *           format: float
 *           example: 1000.00
 *         currency:
 *           type: string
 *           example: XOF
 *         description:
 *           type: string
 *           example: "Abonnement Plan Basic - monthly"
 *         referenceType:
 *           type: string
 *           nullable: true
 *           example: subscription
 *         referenceId:
 *           type: string
 *           nullable: true
 *           example: clsub456def
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-23T13:30:00.000Z"
 *
 *     TransactionListResponse:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 5
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Transaction'
 */

/**
 * @swagger
 * /api/v1/transactions/user/{userId}:
 *   get:
 *     summary: Liste des transactions d'un utilisateur
 *     description: |
 *       Retourne toutes les transactions financières d'un utilisateur, triées par date décroissante.
 *       Supporte la pagination et le filtrage par type.
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: cluser123abc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [subscription_payment, refund, adjustment]
 *         description: Filtrer par type de transaction
 *     responses:
 *       200:
 *         description: Liste paginée des transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionListResponse'
 */
router.get('/user/:userId', controller.listByUser);

/**
 * @swagger
 * /api/v1/transactions/{id}:
 *   get:
 *     summary: Détail d'une transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: cltx123abc
 *     responses:
 *       200:
 *         description: Détail de la transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Transaction introuvable.
 */
router.get('/:id', controller.getOne);

module.exports = router;
