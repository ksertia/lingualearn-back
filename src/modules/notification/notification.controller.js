const service = require('./notification.service');
const { createNotificationSchema } = require('./notification.schema');

async function create(req, res, next) {
  try {
    const { error, value } = createNotificationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const notification = await service.createNotification(value);
    // WebSocket: notifier le client ici (voir ws.js)
    if (req.io) {
      req.io.to(value.userId).emit('notification', notification);
    }
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
}

async function getUserNotifications(req, res, next) {
  try {
    const notifications = await service.getUserNotifications(req.params.userId);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notif = await service.markAsRead(req.params.id);
    res.json(notif);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.deleteNotification(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getUserNotifications,
  markAsRead,
  remove
};
