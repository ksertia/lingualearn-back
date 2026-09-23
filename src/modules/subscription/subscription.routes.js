const express = require('express');
const controller = require('./subscription.controller');
const { allowRoles } = require('../../middleware/authMiddleware');
const router = express.Router();

// Gestion administrative brute des abonnements (créer/lister/modifier/supprimer n'importe
// lequel) — réservée à l'admin/plateform_manager. authMiddleware est déjà appliqué au montage
// de ce routeur (router.use('/subscriptions', authMiddleware, ...) dans src/routes/index.js).
// Le vrai flux de souscription utilisateur passe par POST /payment/initiate+confirm ou
// /payment/coins, pas par ces routes.
const adminOnly = allowRoles('admin', 'plateform_manager');

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Gestion des abonnements utilisateurs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionCreate:
 *       type: object
 *       required:
 *         - userId
 *         - planId
 *       properties:
 *         userId:
 *           type: string
 *           description: ID du compte parent (learner) qui souscrit
 *           example: cluser123abc
 *         planId:
 *           type: string
 *           description: ID du plan d'abonnement choisi
 *           example: clplan456def
 *         status:
 *           type: string
 *           enum: [active, canceled, pending]
 *           default: active
 *           example: active
 *         billingCycle:
 *           type: string
 *           enum: [monthly, yearly]
 *           default: monthly
 *           description: "monthly = +1 mois | yearly = +1 an. La date de fin est calculée automatiquement."
 *           example: monthly
 *         currentPeriodStart:
 *           type: string
 *           format: date-time
 *           description: "Optionnel. Par défaut : maintenant."
 *           example: "2026-04-23T00:00:00.000Z"
 *         cancelAtPeriodEnd:
 *           type: boolean
 *           default: false
 *           description: Si true, l'abonnement reste actif jusqu'à la fin de la période puis est annulé
 *           example: false
 *
 *     SubscriptionUpdate:
 *       type: object
 *       properties:
 *         planId:
 *           type: string
 *           example: clplan789ghi
 *         status:
 *           type: string
 *           enum: [active, canceled, pending]
 *           example: canceled
 *         billingCycle:
 *           type: string
 *           enum: [monthly, yearly]
 *           example: yearly
 *         currentPeriodStart:
 *           type: string
 *           format: date-time
 *           example: "2026-05-23T00:00:00.000Z"
 *         currentPeriodEnd:
 *           type: string
 *           format: date-time
 *           example: "2026-06-23T00:00:00.000Z"
 *         cancelAtPeriodEnd:
 *           type: boolean
 *           example: true
 *         canceledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-04-23T12:00:00.000Z"
 *
 *     SubscriptionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: clsub789ghi
 *         userId:
 *           type: string
 *           example: cluser123abc
 *         planId:
 *           type: string
 *           example: clplan456def
 *         status:
 *           type: string
 *           enum: [active, canceled, pending]
 *           example: active
 *         billingCycle:
 *           type: string
 *           enum: [monthly, yearly]
 *           example: monthly
 *         currentPeriodStart:
 *           type: string
 *           format: date-time
 *           example: "2026-04-23T00:00:00.000Z"
 *         currentPeriodEnd:
 *           type: string
 *           format: date-time
 *           example: "2026-05-23T00:00:00.000Z"
 *         cancelAtPeriodEnd:
 *           type: boolean
 *           example: false
 *         canceledAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         plan:
 *           $ref: '#/components/schemas/SubscriptionPlanResponse'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-23T10:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-23T10:00:00.000Z"
 */

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Créer un nouvel abonnement (admin/plateform_manager uniquement)
 *     description: |
 *       Lie un utilisateur (`learner`) à un plan d'abonnement.
 *       Met automatiquement à jour `subscriptionId` et `subscriptionEndsAt` sur le compte utilisateur.
 *       Les sous-comptes (`sub_account_learner`) héritent de cet abonnement automatiquement.
 *       Réservé à l'admin/plateform_manager — le vrai flux de souscription utilisateur
 *       passe par POST /payment/initiate+confirm ou /payment/coins.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionCreate'
 *           example:
 *             userId: cluser123abc
 *             planId: clplan456def
 *             billingCycle: monthly
 *     responses:
 *       201:
 *         description: Abonnement créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionResponse'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '"userId" is required'
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 */
router.post('/', adminOnly, controller.create);

/**
 * @swagger
 * /api/v1/subscriptions/my-status:
 *   get:
 *     summary: Statut d'abonnement de l'utilisateur connecté
 *     description: |
 *       Retourne le statut d'abonnement de l'utilisateur identifié par le token JWT.
 *       Indique si l'abonnement est actif, sa date d'expiration et le plan souscrit.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statut d'abonnement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasSubscription:
 *                   type: boolean
 *                   example: true
 *                 isActive:
 *                   type: boolean
 *                   example: true
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   example: "2026-05-23T13:30:00.000Z"
 *                 subscription:
 *                   $ref: '#/components/schemas/SubscriptionResponse'
 */
router.get('/my-status', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, controller.myStatus);

/**
 * @swagger
 * /api/v1/subscriptions:
 *   get:
 *     summary: Récupérer tous les abonnements (admin/plateform_manager uniquement)
 *     description: Retourne tous les abonnements avec le plan et l'utilisateur associés.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste de tous les abonnements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SubscriptionResponse'
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 */
router.get('/', adminOnly, controller.getAll);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   get:
 *     summary: Récupérer un abonnement par ID (admin/plateform_manager uniquement)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: clsub789ghi
 *     responses:
 *       200:
 *         description: Abonnement trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionResponse'
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 *       404:
 *         description: Abonnement non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Subscription not found
 */
router.get('/:id', adminOnly, controller.getById);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   put:
 *     summary: Modifier un abonnement (mise à jour partielle, admin/plateform_manager uniquement)
 *     description: |
 *       Tous les champs sont optionnels.
 *       Si `currentPeriodEnd` est modifié, `subscriptionEndsAt` sur le compte utilisateur est resynchronisé automatiquement.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: clsub789ghi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionUpdate'
 *           example:
 *             status: canceled
 *             cancelAtPeriodEnd: true
 *             canceledAt: "2026-04-23T12:00:00.000Z"
 *     responses:
 *       200:
 *         description: Abonnement modifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionResponse'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: '"status" must be one of [active, canceled, pending]'
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 *       404:
 *         description: Abonnement non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Subscription not found
 */
router.put('/:id', adminOnly, controller.update);

/**
 * @swagger
 * /api/v1/subscriptions/{id}:
 *   delete:
 *     summary: Supprimer un abonnement (admin/plateform_manager uniquement)
 *     description: Supprime l'abonnement et réinitialise `subscriptionId` et `subscriptionEndsAt` sur le compte utilisateur.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: clsub789ghi
 *     responses:
 *       204:
 *         description: Abonnement supprimé avec succès
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 *       404:
 *         description: Abonnement non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Subscription not found
 */
router.delete('/:id', adminOnly, controller.remove);

module.exports = router;
