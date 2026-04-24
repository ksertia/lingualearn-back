const express = require('express');
const controller = require('./message_ws.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: |
 *     Messagerie temps réel — WebSocket + REST.
 *
 *     **Scénario plateforme :**
 *
 *     1. Un apprenant envoie un message à l'admin :
 *        `POST /messages-ws` → `{ senderId: "learner-id", recipientId: "admin-id", content: "Bonjour !" }`
 *
 *     2. L'admin (ou plateform_manager) consulte **toutes** les conversations de la plateforme :
 *        `GET /messages-ws/conversations` → liste complète, peu importe qui a écrit à qui.
 *
 *     3. L'admin répond à l'apprenant :
 *        `POST /messages-ws` → `{ senderId: "admin-id", recipientId: "learner-id", content: "Bonjour, comment puis-je vous aider ?" }`
 *
 *     4. L'apprenant ouvre l'historique :
 *        `GET /messages-ws/conversation?userA=learner-id&userB=admin-id`
 *
 *     5. L'apprenant marque les messages de l'admin comme lus :
 *        `PUT /messages-ws/read` → `{ senderId: "admin-id" }`
 *
 *     **Temps réel (Socket.IO) :**
 *     - Chaque utilisateur rejoint une room avec son propre `userId` (connexion via token JWT).
 *     - `POST /messages-ws` émet `receive_message` aux deux parties (sender + recipient).
 *     - `PUT /messages-ws/read` émet `messages_read` à l'expéditeur original.
 *     - Événements disponibles côté client : `send_message`, `receive_message`, `typing`, `stop_typing`, `mark_read`, `messages_read`.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: Kader
 *         lastName:
 *           type: string
 *           example: Ouédraogo
 *         avatarUrl:
 *           type: string
 *           nullable: true
 *           example: https://cdn.lingualearn.app/avatars/abc123.jpg
 *     MessageParticipant:
 *       type: object
 *       description: Informations sur l'expéditeur ou le destinataire d'un message
 *       properties:
 *         id:
 *           type: string
 *           example: cluuid1234abcd
 *         username:
 *           type: string
 *           example: kader_learner
 *         accountType:
 *           type: string
 *           enum: [learner, sub_account_learner, admin, plateform_manager]
 *           example: learner
 *         profile:
 *           $ref: '#/components/schemas/UserProfile'
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: msg_uuid_xyz
 *         senderId:
 *           type: string
 *           example: cluuid1234abcd
 *         recipientId:
 *           type: string
 *           example: admin_uuid_efgh
 *         content:
 *           type: string
 *           example: Bonjour, j'ai un problème avec mon cours.
 *         type:
 *           type: string
 *           enum: [text, image, file]
 *           example: text
 *         metadata:
 *           type: object
 *           nullable: true
 *         isRead:
 *           type: boolean
 *           example: false
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-04-24T10:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         sender:
 *           $ref: '#/components/schemas/MessageParticipant'
 *         recipient:
 *           $ref: '#/components/schemas/MessageParticipant'
 *     Conversation:
 *       type: object
 *       description: Dernière interaction entre deux utilisateurs, avec compteur de non-lus
 *       properties:
 *         sender:
 *           $ref: '#/components/schemas/MessageParticipant'
 *         recipient:
 *           $ref: '#/components/schemas/MessageParticipant'
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         unreadCount:
 *           type: integer
 *           description: Nombre de messages non lus pour l'utilisateur connecté (0 pour admin/plateform_manager)
 *           example: 3
 */

/**
 * @swagger
 * /api/v1/messages-ws:
 *   post:
 *     summary: Envoyer un message
 *     description: |
 *       Crée un message en base de données et le diffuse en temps réel via WebSocket aux deux participants.
 *
 *       **Ce qui se passe en arrière-plan :**
 *       - Le message est sauvegardé en DB avec `isRead: false`.
 *       - `req.io.to(recipientId).emit('receive_message', message)` → le destinataire reçoit le message instantanément.
 *       - `req.io.to(senderId).emit('receive_message', message)` → l'expéditeur reçoit la confirmation avec l'objet complet (id, createdAt, etc.).
 *
 *       **Qui peut envoyer à qui ?**
 *       - Un apprenant peut écrire à l'admin ou au plateform_manager.
 *       - L'admin/plateform_manager peut répondre à n'importe quel utilisateur.
 *       - Deux apprenants peuvent également échanger entre eux.
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
 *                 description: ID de l'utilisateur qui envoie le message
 *                 example: cluuid1234abcd
 *               recipientId:
 *                 type: string
 *                 description: ID du destinataire
 *                 example: admin_uuid_efgh
 *               content:
 *                 type: string
 *                 description: Contenu du message
 *                 example: Bonjour, j'ai un problème avec mon cours de français.
 *               type:
 *                 type: string
 *                 enum: [text, image, file]
 *                 default: text
 *               metadata:
 *                 type: object
 *                 description: Données supplémentaires (URL fichier, dimensions image, etc.)
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Message créé et diffusé via WebSocket
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *             example:
 *               id: msg_uuid_xyz
 *               senderId: cluuid1234abcd
 *               recipientId: admin_uuid_efgh
 *               content: Bonjour, j'ai un problème avec mon cours de français.
 *               type: text
 *               isRead: false
 *               readAt: null
 *               createdAt: "2026-04-24T10:00:00.000Z"
 *               sender:
 *                 id: cluuid1234abcd
 *                 username: kader_learner
 *                 accountType: learner
 *                 profile:
 *                   firstName: Kader
 *                   lastName: Ouédraogo
 *                   avatarUrl: null
 *               recipient:
 *                 id: admin_uuid_efgh
 *                 username: admin_lingualearn
 *                 accountType: admin
 *                 profile:
 *                   firstName: Admin
 *                   lastName: LinguaLearn
 *                   avatarUrl: null
 *       400:
 *         description: Données invalides (senderId, recipientId ou content manquant)
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/messages-ws/conversations:
 *   get:
 *     summary: Liste des conversations
 *     description: |
 *       Retourne la liste des conversations avec le dernier message de chaque fil et le nombre de messages non lus.
 *
 *       **Comportement selon le rôle :**
 *       - **Utilisateur normal (learner, sub_account_learner)** : voit uniquement ses propres conversations (en tant qu'expéditeur OU destinataire).
 *       - **Admin / plateform_manager** : voit **toutes** les conversations de la plateforme, quel que soit l'utilisateur.
 *
 *       **Déduplification** : une seule entrée par paire d'interlocuteurs (le message le plus récent est affiché).
 *
 *       **unreadCount** : nombre de messages non lus pour l'utilisateur connecté. Toujours `0` pour admin/plateform_manager (pas de compteur personnel).
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des conversations avec dernier message et compteur non-lus
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Conversation'
 *             example:
 *               - sender:
 *                   id: cluuid1234abcd
 *                   username: kader_learner
 *                   accountType: learner
 *                   profile:
 *                     firstName: Kader
 *                     lastName: Ouédraogo
 *                     avatarUrl: null
 *                 recipient:
 *                   id: admin_uuid_efgh
 *                   username: admin_lingualearn
 *                   accountType: admin
 *                   profile:
 *                     firstName: Admin
 *                     lastName: LinguaLearn
 *                     avatarUrl: null
 *                 lastMessage:
 *                   id: msg_uuid_xyz
 *                   content: Bonjour, j'ai un problème avec mon cours.
 *                   isRead: false
 *                   createdAt: "2026-04-24T10:00:00.000Z"
 *                 unreadCount: 2
 *               - sender:
 *                   id: learner2_uuid
 *                   username: aissatou_learner
 *                   accountType: learner
 *                   profile:
 *                     firstName: Aissatou
 *                     lastName: Traoré
 *                     avatarUrl: null
 *                 recipient:
 *                   id: admin_uuid_efgh
 *                   username: admin_lingualearn
 *                   accountType: admin
 *                   profile:
 *                     firstName: Admin
 *                     lastName: LinguaLearn
 *                     avatarUrl: null
 *                 lastMessage:
 *                   id: msg_uuid_abc
 *                   content: Merci pour votre aide !
 *                   isRead: true
 *                   createdAt: "2026-04-23T15:30:00.000Z"
 *                 unreadCount: 0
 */
router.get('/conversations', controller.getConversations);

/**
 * @swagger
 * /api/v1/messages-ws/unread-count:
 *   get:
 *     summary: Nombre total de messages non lus (badge)
 *     description: |
 *       Retourne le nombre total de messages non lus pour l'utilisateur connecté.
 *       Utile pour afficher un badge sur l'icône de messagerie.
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
 *                   example: 5
 *             example:
 *               unreadCount: 5
 */
router.get('/unread-count', controller.getUnreadCount);

/**
 * @swagger
 * /api/v1/messages-ws/conversation:
 *   get:
 *     summary: Historique paginé entre deux utilisateurs
 *     description: |
 *       Retourne tous les messages échangés entre `userA` et `userB`, triés par date croissante (du plus ancien au plus récent).
 *
 *       **Exemple d'usage :** l'apprenant ouvre la conversation avec l'admin → `?userA=learner-id&userB=admin-id`.
 *
 *       La réponse inclut la pagination complète (`total`, `page`, `limit`) pour charger les messages plus anciens au scroll.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userA
 *         required: true
 *         description: ID du premier utilisateur
 *         schema:
 *           type: string
 *           example: cluuid1234abcd
 *       - in: query
 *         name: userB
 *         required: true
 *         description: ID du second utilisateur
 *         schema:
 *           type: string
 *           example: admin_uuid_efgh
 *       - in: query
 *         name: page
 *         description: Numéro de page (1 = messages les plus récents si limit atteint)
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         description: Nombre de messages par page
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Messages paginés entre les deux utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Nombre total de messages dans cette conversation
 *                   example: 42
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 30
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *             example:
 *               total: 3
 *               page: 1
 *               limit: 30
 *               items:
 *                 - id: msg_001
 *                   content: Bonjour, j'ai un problème avec mon cours de français.
 *                   senderId: cluuid1234abcd
 *                   recipientId: admin_uuid_efgh
 *                   isRead: true
 *                   createdAt: "2026-04-24T10:00:00.000Z"
 *                   sender:
 *                     id: cluuid1234abcd
 *                     username: kader_learner
 *                     accountType: learner
 *                     profile:
 *                       firstName: Kader
 *                       lastName: Ouédraogo
 *                       avatarUrl: null
 *                   recipient:
 *                     id: admin_uuid_efgh
 *                     username: admin_lingualearn
 *                     accountType: admin
 *                     profile:
 *                       firstName: Admin
 *                       lastName: LinguaLearn
 *                       avatarUrl: null
 *                 - id: msg_002
 *                   content: Bonjour Kader, pouvez-vous préciser le problème ?
 *                   senderId: admin_uuid_efgh
 *                   recipientId: cluuid1234abcd
 *                   isRead: true
 *                   createdAt: "2026-04-24T10:05:00.000Z"
 *                   sender:
 *                     id: admin_uuid_efgh
 *                     username: admin_lingualearn
 *                     accountType: admin
 *                     profile:
 *                       firstName: Admin
 *                       lastName: LinguaLearn
 *                       avatarUrl: null
 *                   recipient:
 *                     id: cluuid1234abcd
 *                     username: kader_learner
 *                     accountType: learner
 *                     profile:
 *                       firstName: Kader
 *                       lastName: Ouédraogo
 *                       avatarUrl: null
 *                 - id: msg_003
 *                   content: Le module 3 ne se charge pas depuis hier.
 *                   senderId: cluuid1234abcd
 *                   recipientId: admin_uuid_efgh
 *                   isRead: false
 *                   createdAt: "2026-04-24T10:10:00.000Z"
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
 *       Marque comme lus tous les messages envoyés par `senderId` à l'utilisateur connecté (extrait du JWT).
 *
 *       **Ce qui se passe en arrière-plan :**
 *       - Met à jour `isRead = true` et `readAt = now()` pour tous les messages concernés.
 *       - Émet `messages_read` via WebSocket à l'expéditeur original : `{ by: recipientId }`.
 *       - L'expéditeur peut ainsi afficher un indicateur "lu" (double coche bleue) dans son interface.
 *
 *       **Exemple :** l'apprenant ouvre la conversation avec l'admin → l'app appelle `PUT /read` avec `{ senderId: "admin-id" }` pour indiquer que les messages de l'admin ont été lus.
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
 *                 description: ID de l'utilisateur dont les messages doivent être marqués comme lus
 *                 example: admin_uuid_efgh
 *     responses:
 *       200:
 *         description: Messages marqués comme lus, événement WebSocket envoyé à l'expéditeur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: Messages marqués comme lus.
 *       400:
 *         description: senderId manquant
 */
router.put('/read', controller.markAsRead);

module.exports = router;
