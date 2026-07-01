const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

async function createNotification(data) {
  const notif = await prisma.notification.create({ data });
  await cacheDel(`notif:${data.userId}:unread`);
  return notif;
}

async function getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  // 3 queries in parallel: total, items, unread count
  const [total, items, unreadCount] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    cacheWrap(`notif:${userId}:unread`, () => prisma.notification.count({ where: { userId, isRead: false } }), TTL.SHORT)
  ]);

  return { total, page, limit, unreadCount, items };
}

async function getUnreadCount(userId) {
  return cacheWrap(`notif:${userId}:unread`,
    () => prisma.notification.count({ where: { userId, isRead: false } }),
    TTL.SHORT
  );
}

async function markAsRead(id) {
  const notif = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() }
  });
  await cacheDel(`notif:${notif.userId}:unread`);
  return notif;
}

async function markAllAsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() }
  });
  await cacheDel(`notif:${userId}:unread`);
  return result;
}

async function deleteNotification(id) {
  const notif = await prisma.notification.findUnique({ where: { id }, select: { userId: true } });
  const deleted = await prisma.notification.delete({ where: { id } });
  if (notif) await cacheDel(`notif:${notif.userId}:unread`);
  return deleted;
}

async function deleteAllByUser(userId) {
  const result = await prisma.notification.deleteMany({ where: { userId } });
  await cacheDel(`notif:${userId}:unread`);
  return result;
}

module.exports = {
  createNotification, getUserNotifications, getUnreadCount,
  markAsRead, markAllAsRead, deleteNotification, deleteAllByUser
};
