const { prisma } = require('../../config/prisma');
const { sendPushNotification } = require('../../config/firebase');

async function createNotification(data) {
  const notification = await prisma.notification.create({ data });
  // Envoyer push FCM si l'utilisateur a des device tokens
  await sendPushToUser(data.userId, data.title, data.message, {
    notificationId: notification.id,
    type: data.notificationType ?? 'info',
    actionUrl: data.actionUrl ?? '',
  });
  return notification;
}

async function sendPushToUser(userId, title, body, extraData = {}) {
  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (tokens.length === 0) return;
  const fcmTokens = tokens.map(t => t.token);
  await sendPushNotification({ tokens: fcmTokens, title, body, data: extraData });
}

async function getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);
  return { total, page, limit, unreadCount: await getUnreadCount(userId), items };
}

async function getUnreadCount(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

async function markAsRead(id) {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

async function deleteNotification(id) {
  return prisma.notification.delete({ where: { id } });
}

// Device tokens FCM
async function registerDeviceToken(userId, token, platform = 'android') {
  return prisma.deviceToken.upsert({
    where: { userId_token: { userId, token } },
    update: { updatedAt: new Date(), platform },
    create: { userId, token, platform },
  });
}

async function removeDeviceToken(userId, token) {
  return prisma.deviceToken.deleteMany({ where: { userId, token } });
}

module.exports = {
  createNotification,
  sendPushToUser,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  registerDeviceToken,
  removeDeviceToken,
};
