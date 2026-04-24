const { prisma } = require('../../config/prisma');
const { sendPushToUser } = require('../notification/notification.service');

async function createMessage(data) {
  const message = await prisma.message.create({
    data,
    include: {
      sender: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
    },
  });

  // Push FCM si destinataire hors ligne
  await sendPushToUser(
    data.recipientId,
    message.sender?.profile?.firstName ?? message.sender?.username ?? 'Nouveau message',
    data.content.length > 100 ? data.content.substring(0, 100) + '...' : data.content,
    { messageId: message.id, senderId: data.senderId, type: 'message' }
  );

  return message;
}

async function getMessagesBetweenUsers(userA, userB, { page = 1, limit = 30 } = {}) {
  const skip = (page - 1) * limit;
  const [total, items] = await Promise.all([
    prisma.message.count({
      where: {
        OR: [
          { senderId: userA, recipientId: userB },
          { senderId: userB, recipientId: userA },
        ],
      },
    }),
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: userA, recipientId: userB },
          { senderId: userB, recipientId: userA },
        ],
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
    }),
  ]);
  return { total, page, limit, items };
}

async function getConversations(userId) {
  // Derniers messages de chaque conversation
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender:    { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      recipient: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
    },
  });

  // Dédupliquer par interlocuteur
  const seen = new Set();
  const conversations = [];
  for (const msg of messages) {
    const otherId = msg.senderId === userId ? msg.recipientId : msg.senderId;
    if (!seen.has(otherId)) {
      seen.add(otherId);
      const unread = await prisma.message.count({
        where: { senderId: otherId, recipientId: userId, isRead: false },
      });
      conversations.push({
        interlocutor: msg.senderId === userId ? msg.recipient : msg.sender,
        lastMessage: msg,
        unreadCount: unread,
      });
    }
  }
  return conversations;
}

async function markMessagesAsRead(senderId, recipientId) {
  return prisma.message.updateMany({
    where: { senderId, recipientId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

async function getUnreadCount(userId) {
  return prisma.message.count({ where: { recipientId: userId, isRead: false } });
}

module.exports = {
  createMessage,
  getMessagesBetweenUsers,
  getConversations,
  markMessagesAsRead,
  getUnreadCount,
};
