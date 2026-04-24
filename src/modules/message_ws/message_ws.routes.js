const express = require('express');
const controller = require('./message_ws.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Messagerie temps réel (WebSocket + REST)
 */

/**
 * @swagger
 * /api/v1/messages-ws:
 *   post:
 *     summary: Envoyer un message (stockage DB + WebSocket + Push FCM)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senderId, recipientId, content]
 *             properties:
 *               senderId:
 *                 type: string
 *               recipientId:
 *                 type: string
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Message envoyé
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/messages-ws/conversations:
 *   get:
 *     summary: Liste des conversations de l'utilisateur connecté
 *     description: Retourne les derniers messages de chaque conversation avec le nombre de non-lus.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des conversations
 */
router.get('/conversations', controller.getConversations);

/**
 * @swagger
 * /api/v1/messages-ws/unread-count:
 *   get:
 *     summary: Nombre total de messages non lus
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Nombre de messages non lus
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 */
router.get('/unread-count', controller.getUnreadCount);

/**
 * @swagger
 * /api/v1/messages-ws/conversation:
 *   get:
 *     summary: Messages entre deux utilisateurs (paginés)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userA
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: userB
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Messages paginés
 */
router.get('/conversation', controller.getConversation);

/**
 * @swagger
 * /api/v1/messages-ws/read:
 *   put:
 *     summary: Marquer les messages d'un expéditeur comme lus
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senderId]
 *             properties:
 *               senderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Messages marqués comme lus
 */
router.put('/read', controller.markAsRead);

module.exports = router;
