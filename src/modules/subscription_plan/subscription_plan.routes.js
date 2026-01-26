const express = require('express');
const controller = require('./subscription_plan.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SubscriptionPlans
 *   description: Gestion des plans d'abonnement
 */

/**
 * @swagger
 * /api/v1/subscription-plans:
 *   post:
 *     summary: Créer un nouveau plan d'abonnement
 *     tags: [SubscriptionPlans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planCode
 *               - planName
 *               - features
 *             properties:
 *               planCode:
 *                 type: string
 *               planName:
 *                 type: string
 *               description:
 *                 type: string
 *               priceMonthly:
 *                 type: number
 *               priceYearly:
 *                 type: number
 *               currency:
 *                 type: string
 *               features:
 *                 type: object
 *               maxSubAccounts:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Plan créé
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/subscription-plans:
 *   get:
 *     summary: Récupérer tous les plans d'abonnement
 *     tags: [SubscriptionPlans]
 *     responses:
 *       200:
 *         description: Liste des plans
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/v1/subscription-plans/{id}:
 *   get:
 *     summary: Récupérer un plan d'abonnement par ID
 *     tags: [SubscriptionPlans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan trouvé
 *       404:
 *         description: Plan non trouvé
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/subscription-plans/{id}:
 *   put:
 *     summary: Modifier un plan d'abonnement
 *     tags: [SubscriptionPlans]
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
 *               planCode:
 *                 type: string
 *               planName:
 *                 type: string
 *               description:
 *                 type: string
 *               priceMonthly:
 *                 type: number
 *               priceYearly:
 *                 type: number
 *               currency:
 *                 type: string
 *               features:
 *                 type: object
 *               maxSubAccounts:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Plan modifié
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Plan non trouvé
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/v1/subscription-plans/{id}:
 *   delete:
 *     summary: Supprimer un plan d'abonnement
 *     tags: [SubscriptionPlans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Plan supprimé
 *       404:
 *         description: Plan non trouvé
 */
router.delete('/:id', controller.remove);

module.exports = router;
