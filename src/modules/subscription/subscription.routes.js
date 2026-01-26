const express = require('express');
const controller = require('./subscription.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Gestion des abonnements clients
 */

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Créer un nouvel abonnement
 *     tags: [Subscriptions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - planId
 *               - currentPeriodStart
 *               - currentPeriodEnd
 *             properties:
 *               userId:
 *                 type: string
 *               planId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, canceled, pending]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               currentPeriodStart:
 *                 type: string
 *                 format: date-time
 *               currentPeriodEnd:
 *                 type: string
 *                 format: date-time
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *               canceledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Abonnement créé
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/subscriptions:
 *   get:
 *     summary: Récupérer tous les abonnements
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Liste des abonnements
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   get:
 *     summary: Récupérer un abonnement par ID
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Abonnement trouvé
 *       404:
 *         description: Abonnement non trouvé
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   put:
 *     summary: Modifier un abonnement
 *     tags: [Subscriptions]
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
 *               status:
 *                 type: string
 *                 enum: [active, canceled, pending]
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               currentPeriodStart:
 *                 type: string
 *                 format: date-time
 *               currentPeriodEnd:
 *                 type: string
 *                 format: date-time
 *               cancelAtPeriodEnd:
 *                 type: boolean
 *               canceledAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Abonnement modifié
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Abonnement non trouvé
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   delete:
 *     summary: Supprimer un abonnement
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Abonnement supprimé
 *       404:
 *         description: Abonnement non trouvé
 */
router.delete('/:id', controller.remove);

module.exports = router;
