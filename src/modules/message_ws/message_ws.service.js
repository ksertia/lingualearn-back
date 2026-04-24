const { prisma } = require('../../config/prisma');

async function createMessage(data) {
  return prisma.message.create({
    data,
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
  });
}

async function getMessagesBetweenUsers(userA, userB, { page = 1, limit = 30 } = {}) {
  const skip = (page - 1) * limit;
  const where = {
    OR: [
      { senderId: userA, recipientId: userB },
      { senderId: userB, recipientId: userA },
    ],
  };
  const [total, items] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    }),
  ]);
  return { total, page, limit, items };
}

async function getConversations(userId) {
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      sender:    { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      recipient: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
    },
  });

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
        lastMessage:  msg,
        unreadCount:  unread,
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
