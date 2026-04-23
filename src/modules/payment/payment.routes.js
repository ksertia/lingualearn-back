const express = require('express');
const controller = require('./payment.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Paiement et souscription aux forfaits
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentInitiateRequest:
 *       type: object
 *       required:
 *         - userId
 *         - planId
 *         - paymentMethod
 *         - phoneNumber
 *       properties:
 *         userId:
 *           type: string
 *           description: ID de l'utilisateur qui souscrit
 *           example: cluser123abc
 *         planId:
 *           type: string
 *           description: ID du forfait choisi
 *           example: clplan456def
 *         billingCycle:
 *           type: string
 *           enum: [monthly, yearly]
 *           default: monthly
 *           description: "monthly = +1 mois | yearly = +1 an"
 *           example: monthly
 *         paymentMethod:
 *           type: string
 *           enum: [orange_money, moov_money, coris_money]
 *           description: Opérateur de paiement mobile
 *           example: orange_money
 *         phoneNumber:
 *           type: string
 *           description: Numéro de téléphone associé au compte mobile money
 *           example: "+22670123456"
 *
 *     PaymentInitiateResponse:
 *       type: object
 *       properties:
 *         paymentRequestId:
 *           type: string
 *           description: ID à utiliser pour confirmer le paiement avec l'OTP
 *           example: clpay789xyz
 *         phoneNumber:
 *           type: string
 *           example: "+22670123456"
 *         amount:
 *           type: number
 *           format: float
 *           description: Montant à payer
 *           example: 1000.00
 *         currency:
 *           type: string
 *           example: XOF
 *         plan:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: clplan456def
 *             planName:
 *               type: string
 *               example: Plan Basic
 *             planCode:
 *               type: string
 *               example: BASIC
 *         otpExpiresAt:
 *           type: string
 *           format: date-time
 *           description: Date d'expiration de l'OTP (5 minutes)
 *           example: "2026-04-23T13:35:00.000Z"
 *         _devOtp:
 *           type: string
 *           description: "⚠️ Mode fictif uniquement — code OTP à utiliser pour tester. À retirer en production."
 *           example: "482916"
 *
 *     PaymentConfirmRequest:
 *       type: object
 *       required:
 *         - paymentRequestId
 *         - otpCode
 *       properties:
 *         paymentRequestId:
 *           type: string
 *           description: ID reçu lors de l'initiation du paiement
 *           example: clpay789xyz
 *         otpCode:
 *           type: string
 *           minLength: 6
 *           maxLength: 6
 *           description: Code OTP à 6 chiffres reçu (ou visible dans _devOtp en mode fictif)
 *           example: "482916"
 *
 *     PaymentConfirmResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Paiement confirmé. Abonnement activé.
 *         subscription:
 *           $ref: '#/components/schemas/SubscriptionResponse'
 *
 *     PaymentHistoryItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: clpay789xyz
 *         planId:
 *           type: string
 *           example: clplan456def
 *         billingCycle:
 *           type: string
 *           enum: [monthly, yearly]
 *           example: monthly
 *         paymentMethod:
 *           type: string
 *           enum: [orange_money, moov_money, coris_money]
 *           example: orange_money
 *         phoneNumber:
 *           type: string
 *           example: "+22670123456"
 *         amount:
 *           type: number
 *           format: float
 *           example: 1000.00
 *         currency:
 *           type: string
 *           example: XOF
 *         status:
 *           type: string
 *           enum: [pending, confirmed, failed]
 *           example: confirmed
 *         failureReason:
 *           type: string
 *           nullable: true
 *           example: null
 *         confirmedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-04-23T13:30:00.000Z"
 *         otpExpiresAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-23T13:35:00.000Z"
 *         plan:
 *           type: object
 *           properties:
 *             planName:
 *               type: string
 *               example: Plan Basic
 *             planCode:
 *               type: string
 *               example: BASIC
 *             currency:
 *               type: string
 *               example: XOF
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-23T13:25:00.000Z"
 */

/**
 * @swagger
 * /api/v1/payment/initiate:
 *   post:
 *     summary: Initier un paiement pour souscrire à un forfait
 *     description: |
 *       **Étape 1 du flow de paiement.**
 *
 *       L'utilisateur choisit un forfait, un mode de paiement et entre son numéro.
 *       Un code OTP à 6 chiffres est généré (valable 5 minutes).
 *
 *       En mode fictif, l'OTP est retourné directement dans `_devOtp`.
 *       En production, il sera envoyé par SMS.
 *
 *       Conservez le `paymentRequestId` pour l'étape de confirmation.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInitiateRequest'
 *           example:
 *             userId: cluser123abc
 *             planId: clplan456def
 *             billingCycle: monthly
 *             paymentMethod: orange_money
 *             phoneNumber: "+22670123456"
 *     responses:
 *       201:
 *         description: Paiement initié, OTP envoyé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentInitiateResponse'
 *       400:
 *         description: Données invalides ou plan inactif
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Méthode de paiement non supportée. Utilisez :orange_money, moov_money, coris_money
 *       404:
 *         description: Plan introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Plan introuvable.
 */
router.post('/initiate', controller.initiate);

/**
 * @swagger
 * /api/v1/payment/confirm:
 *   post:
 *     summary: Confirmer le paiement avec le code OTP
 *     description: |
 *       **Étape 2 du flow de paiement.**
 *
 *       Valide l'OTP reçu et active l'abonnement.
 *       - Si un abonnement existait déjà, il est remplacé.
 *       - `subscriptionId` et `subscriptionEndsAt` sont mis à jour sur le compte utilisateur.
 *       - Une transaction est enregistrée automatiquement.
 *
 *       L'OTP est valable **5 minutes** après l'initiation.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentConfirmRequest'
 *           example:
 *             paymentRequestId: clpay789xyz
 *             otpCode: "482916"
 *     responses:
 *       200:
 *         description: Paiement confirmé, abonnement activé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentConfirmResponse'
 *       400:
 *         description: OTP incorrect ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Code OTP incorrect.
 *       404:
 *         description: Demande de paiement introuvable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Demande de paiement introuvable.
 */
router.post('/confirm', controller.confirm);

/**
 * @swagger
 * /api/v1/payment/history/{userId}:
 *   get:
 *     summary: Historique des paiements d'un utilisateur
 *     description: Retourne toutes les demandes de paiement (pending, confirmed, failed) triées par date décroissante.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: cluser123abc
 *     responses:
 *       200:
 *         description: Historique des paiements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentHistoryItem'
 */
router.get('/history/:userId', controller.history);

module.exports = router;
