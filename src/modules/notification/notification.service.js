const { prisma } = require('../../config/prisma');

async function createNotification(data) {
  return prisma.notification.create({ data });
}

async function getUserNotifications(userId) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function markAsRead(id) {
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

async function deleteNotification(id) {
  return prisma.notification.delete({ where: { id } });
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  deleteNotification
};
