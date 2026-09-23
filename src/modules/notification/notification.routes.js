const express = require('express');
const controller = require('./notification.controller');
const { allowSelfOrRoles, allowRoles } = require('../../middleware/authMiddleware');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notifications in-app + WebSocket temps réel
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Créer et envoyer une notification (DB + WebSocket)
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
 *                 default: info
 *               actionUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification créée et envoyée
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 */
router.post('/', allowRoles('admin', 'plateform_manager'), controller.create);

/**
 * @swagger
 * /api/v1/notifications/user/{userId}:
 *   get:
 *     summary: Notifications d'un utilisateur (paginées + unreadCount)
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
 *       403:
 *         description: Vous ne pouvez consulter que vos propres notifications, sauf admin/plateform_manager
 */
router.get('/user/:userId', allowSelfOrRoles('userId', 'admin', 'plateform_manager'), controller.getUserNotifications);

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
 *       403:
 *         description: Vous ne pouvez marquer comme lues que vos propres notifications, sauf admin/plateform_manager
 */
router.put('/user/:userId/read-all', allowSelfOrRoles('userId', 'admin', 'plateform_manager'), controller.markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/user/{userId}:
 *   delete:
 *     summary: Supprimer toutes les notifications d'un utilisateur
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
 *         description: Nombre de notifications supprimées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deleted:
 *                   type: integer
 *       403:
 *         description: Vous ne pouvez supprimer que vos propres notifications, sauf admin/plateform_manager
 */
router.delete('/user/:userId', allowSelfOrRoles('userId', 'admin', 'plateform_manager'), controller.removeAllByUser);

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
 *       403:
 *         description: Vous ne pouvez modifier que vos propres notifications, sauf admin/plateform_manager
 *       404:
 *         description: Notification introuvable
 */
router.put('/:id/read', controller.markAsRead);

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
 *       403:
 *         description: Vous ne pouvez supprimer que vos propres notifications, sauf admin/plateform_manager
 *       404:
 *         description: Notification introuvable
 */
router.delete('/:id', controller.remove);

module.exports = router;
