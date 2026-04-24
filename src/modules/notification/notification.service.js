const { prisma } = require('../../config/prisma');

async function createNotification(data) {
  return prisma.notification.create({ data });
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

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
