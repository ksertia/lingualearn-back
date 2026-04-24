const express = require('express');
const controller = require('./notification.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notifications in-app + Push FCM (Flutter)
 */

/**
 * @swagger
 * /api/v1/notifications/device-token:
 *   post:
 *     summary: Enregistrer un device token FCM (Flutter)
 *     description: À appeler au démarrage de l'app Flutter pour activer les push notifications.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "fcm_token_ici"
 *               platform:
 *                 type: string
 *                 enum: [android, ios]
 *                 default: android
 *     responses:
 *       201:
 *         description: Token enregistré
 */
router.post('/device-token', controller.registerToken);

/**
 * @swagger
 * /api/v1/notifications/device-token:
 *   delete:
 *     summary: Supprimer un device token (déconnexion)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       204:
 *         description: Token supprimé
 */
router.delete('/device-token', controller.removeToken);

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Créer et envoyer une notification (WebSocket + Push FCM)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, title, message]
 *             properties:
 *               userId:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               notificationType:
 *                 type: string
 *                 example: info
 *               actionUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification créée et envoyée
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/notifications/user/{userId}:
 *   get:
 *     summary: Notifications d'un utilisateur (paginées)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *           default: 20
 *     responses:
 *       200:
 *         description: Liste paginée avec unreadCount
 */
router.get('/user/:userId', controller.getUserNotifications);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   put:
 *     summary: Marquer une notification comme lue
 *     tags: [Notifications]
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
 *         description: Notification mise à jour
 */
router.put('/:id/read', controller.markAsRead);

/**
 * @swagger
 * /api/v1/notifications/user/{userId}/read-all:
 *   put:
 *     summary: Marquer toutes les notifications comme lues
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Toutes marquées comme lues
 */
router.put('/user/:userId/read-all', controller.markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Supprimer une notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Supprimée
 */
router.delete('/:id', controller.remove);

module.exports = router;
