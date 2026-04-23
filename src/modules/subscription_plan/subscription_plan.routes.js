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
 * components:
 *   schemas:
 *     SubscriptionPlanBase:
 *       type: object
 *       properties:
 *         planCode:
 *           type: string
 *           maxLength: 50
 *           example: PREMIUM
 *         planName:
 *           type: string
 *           maxLength: 100
 *           example: Plan Premium
 *         description:
 *           type: string
 *           nullable: true
 *           example: Accès complet à tous les modules et sous-comptes
 *         priceMonthly:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: 19.99
 *         priceYearly:
 *           type: number
 *           format: float
 *           nullable: true
 *           example: 199.99
 *         reducePrice:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: Prix réduit (promotion). Le pourcentage est calculé automatiquement.
 *           example: 14.99
 *         currency:
 *           type: string
 *           maxLength: 3
 *           default: EUR
 *           example: EUR
 *         features:
 *           type: object
 *           description: Fonctionnalités incluses dans le plan (JSON libre)
 *           example:
 *             accessModules: true
 *             accessCertificates: true
 *             downloadContent: false
 *             maxSubAccounts: 3
 *         maxSubAccounts:
 *           type: integer
 *           default: 0
 *           example: 3
 *         isActive:
 *           type: boolean
 *           default: true
 *           example: true
 *
 *     SubscriptionPlanCreate:
 *       allOf:
 *         - $ref: '#/components/schemas/SubscriptionPlanBase'
 *         - required:
 *             - planCode
 *             - planName
 *             - features
 *
 *     SubscriptionPlanResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SubscriptionPlanBase'
 *         - type: object
 *           properties:
 *             id:
 *               type: string
 *               example: clxyz1234abcd
 *             percentage:
 *               type: number
 *               format: float
 *               nullable: true
 *               description: "Pourcentage de réduction calculé automatiquement : ((priceMonthly - reducePrice) / priceMonthly) * 100"
 *               example: 25.03
 *             _count:
 *               type: object
 *               properties:
 *                 subscriptions:
 *                   type: integer
 *                   description: Nombre d'abonnés actifs sur ce plan
 *                   example: 42
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: "2026-04-22T10:00:00.000Z"
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               example: "2026-04-23T08:30:00.000Z"
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
 *             $ref: '#/components/schemas/SubscriptionPlanCreate'
 *           example:
 *             planCode: PREMIUM
 *             planName: Plan Premium
 *             description: Accès complet à tous les modules
 *             priceMonthly: 19.99
 *             priceYearly: 199.99
 *             reducePrice: 14.99
 *             currency: EUR
 *             features:
 *               accessModules: true
 *               accessCertificates: true
 *               downloadContent: false
 *             maxSubAccounts: 3
 *             isActive: true
 *     responses:
 *       201:
 *         description: Plan créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionPlanResponse'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '"planCode" is required'
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
 *         description: Liste de tous les plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubscriptionPlanResponse'
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
 *         example: clxyz1234abcd
 *     responses:
 *       200:
 *         description: Plan trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionPlanResponse'
 *       404:
 *         description: Plan non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: SubscriptionPlan not found
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/subscription-plans/{id}:
 *   put:
 *     summary: Modifier un plan d'abonnement (mise à jour partielle)
 *     description: Tous les champs sont optionnels. Le champ `percentage` est recalculé automatiquement si `priceMonthly` ou `reducePrice` est modifié.
 *     tags: [SubscriptionPlans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: clxyz1234abcd
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionPlanBase'
 *           example:
 *             reducePrice: 9.99
 *             isActive: false
 *     responses:
 *       200:
 *         description: Plan modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionPlanResponse'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '"reducePrice" must be greater than or equal to 0'
 *       404:
 *         description: Plan non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: SubscriptionPlan not found
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
 *         example: clxyz1234abcd
 *     responses:
 *       204:
 *         description: Plan supprimé avec succès
 *       404:
 *         description: Plan non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: SubscriptionPlan not found
 */
router.delete('/:id', controller.remove);

module.exports = router;
