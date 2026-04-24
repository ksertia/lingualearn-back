const { prisma } = require('../../config/prisma');

const SENDER_SELECT = {
  id:          true,
  username:    true,
  accountType: true,
  profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
};

const ADMIN_ROLES = ['admin', 'plateform_manager'];

async function createMessage(data) {
  return prisma.message.create({
    data,
    include: {
      sender:    { select: SENDER_SELECT },
      recipient: { select: SENDER_SELECT },
    },
  });
}

async function getMessagesBetweenUsers(userA, userB, { page = 1, limit = 30 } = {}) {
  const skip  = (page - 1) * limit;
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
        sender:    { select: SENDER_SELECT },
        recipient: { select: SENDER_SELECT },
      },
    }),
  ]);
  return { total, page, limit, items };
}

// Pour un utilisateur normal : ses propres conversations
// Pour admin/plateform_manager : toutes les conversations de la plateforme
async function getConversations(userId, accountType) {
  const isAdmin = ADMIN_ROLES.includes(accountType);

  const where = isAdmin
    ? {}  // admin voit tout
    : { OR: [{ senderId: userId }, { recipientId: userId }] };

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      sender:    { select: SENDER_SELECT },
      recipient: { select: SENDER_SELECT },
    },
  });

  // Dédupliquer par paire d'interlocuteurs
  const seen = new Set();
  const conversations = [];

  for (const msg of messages) {
    // Clé unique pour la paire (ordre canonique)
    const pairKey = [msg.senderId, msg.recipientId].sort().join('|');
    if (!seen.has(pairKey)) {
      seen.add(pairKey);

      const unread = isAdmin
        ? 0  // admin : pas de compteur non-lu personnel
        : await prisma.message.count({
            where: {
              senderId:    msg.senderId === userId ? msg.recipientId : msg.senderId,
              recipientId: userId,
              isRead:      false,
            },
          });

      conversations.push({
        sender:      msg.sender,
        recipient:   msg.recipient,
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
