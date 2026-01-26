const express = require('express');
const controller = require('./message_ws.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: MessagesWS
 *   description: Messagerie temps réel (WebSocket)
 */

/**
 * @swagger
 * /api/v1/messages-ws:
 *   post:
 *     summary: Envoyer un message (stockage + websocket)
 *     tags: [MessagesWS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderId
 *               - recipientId
 *               - content
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
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Message envoyé
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/messages-ws/conversation:
 *   get:
 *     summary: Récupérer la conversation entre deux utilisateurs
 *     tags: [MessagesWS]
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
 *     responses:
 *       200:
 *         description: Liste des messages
 *       400:
 *         description: Paramètres manquants
 */
router.get('/conversation', controller.getConversation);

module.exports = router;
