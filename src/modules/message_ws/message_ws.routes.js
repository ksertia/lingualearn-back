const express = require('express');
const controller = require('./message_ws.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Messagerie temps réel — WebSocket + REST
 */

/**
 * @swagger
 * /api/v1/messages-ws:
 *   post:
 *     summary: Envoyer un message
 *     description: |
 *       Crée le message en DB et le diffuse via WebSocket aux deux participants (`receive_message`).
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
 *         description: Message créé et diffusé
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/messages-ws/support:
 *   post:
 *     summary: Contacter le support (learner → admin)
 *     description: |
 *       Permet à un learner de contacter le support sans connaître l'ID d'un admin.
 *       Le message est automatiquement dirigé vers le premier admin actif disponible.
 *       Réservé aux learners — les admins utilisent la messagerie directe (`POST /`).
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
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
 *         description: Message envoyé au support
 *       503:
 *         description: Aucun agent support disponible
 */
router.post('/support', controller.contactSupport);

/**
 * @swagger
 * /api/v1/messages-ws/conversations:
 *   get:
 *     summary: Liste des conversations
 *     description: |
 *       Retourne le dernier message de chaque fil avec le nombre de messages non lus.
 *
 *       - **Utilisateur normal** : ses propres conversations uniquement.
 *       - **Admin / plateform_manager** : toutes les conversations de la plateforme.
 *
 *       `unreadCount` est toujours `0` pour admin/plateform_manager.
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
 *     summary: Nombre total de messages non lus (badge)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compteur de messages non lus
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
 *     summary: Historique paginé entre deux utilisateurs
 *     description: Messages triés par date croissante. Charger les pages suivantes pour les messages plus anciens.
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
 *         description: Messages paginés (total, page, limit, items)
 *       400:
 *         description: userA et userB sont requis
 */
router.get('/conversation', controller.getConversation);

/**
 * @swagger
 * /api/v1/messages-ws/read:
 *   put:
 *     summary: Marquer les messages d'un expéditeur comme lus
 *     description: |
 *       Marque comme lus tous les messages de `senderId` reçus par l'utilisateur connecté.
 *       Émet `messages_read` via WebSocket à l'expéditeur : `{ by: recipientId }`.
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
 *       400:
 *         description: senderId manquant
 */
router.put('/read', controller.markAsRead);

/**
 * @swagger
 * /api/v1/messages-ws/{id}:
 *   delete:
 *     summary: Supprimer un message
 *     description: |
 *       Supprime un message. Seul l'expéditeur peut supprimer son propre message.
 *       Émet `message_deleted` via WebSocket aux deux participants : `{ id }`.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message supprimé
 *       403:
 *         description: Non autorisé (pas l'expéditeur)
 *       404:
 *         description: Message introuvable
 */
router.delete('/:id', controller.deleteMessage);

module.exports = router;
