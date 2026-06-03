const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, TTL } = require('../../utils/cache');

const SENDER_SELECT = {
  id: true, username: true, accountType: true,
  profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
};

const ADMIN_ROLES = ['admin', 'plateform_manager'];

async function userExists(userId) {
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, accountType: true } });
}

// Retourne le premier admin actif disponible pour recevoir les messages support
async function getDefaultAdmin() {
  return prisma.user.findFirst({
    where: { accountType: { in: ADMIN_ROLES }, isActive: true },
    select: { id: true, accountType: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function createMessage(data) {
  const message = await prisma.message.create({
    data,
    include: { sender: { select: SENDER_SELECT }, recipient: { select: SENDER_SELECT } },
  });
  // Invalidate unread count for recipient
  cacheDel(`msg:unread:${data.recipientId}`).catch(() => {});
  return message;
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
      where, orderBy: { createdAt: 'asc' }, skip, take: limit,
      include: { sender: { select: SENDER_SELECT }, recipient: { select: SENDER_SELECT } },
    }),
  ]);
  return { total, page, limit, items };
}

async function getConversations(userId, accountType) {
  const isAdmin = ADMIN_ROLES.includes(accountType);

  const where = isAdmin
    ? {}
    : { OR: [{ senderId: userId }, { recipientId: userId }] };

  // Fetch only the latest message per conversation — capped at 500 to avoid OOM
  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { sender: { select: SENDER_SELECT }, recipient: { select: SENDER_SELECT } },
  });

  // Deduplicate by canonical pair key
  const seen    = new Set();
  const pairIds = []; // collect unique partner IDs for batch unread count
  const rawConversations = [];

  for (const msg of messages) {
    const pairKey = [msg.senderId, msg.recipientId].sort().join('|');
    if (!seen.has(pairKey)) {
      seen.add(pairKey);
      const partnerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      rawConversations.push({ msg, partnerId });
      if (!isAdmin) pairIds.push(partnerId);
    }
  }

  if (isAdmin) {
    return rawConversations.map(({ msg }) => ({
      sender: msg.sender, recipient: msg.recipient, lastMessage: msg, unreadCount: 0,
    }));
  }

  // Batch unread counts: 1 groupBy query instead of N COUNT queries
  const unreadGroups = pairIds.length
    ? await prisma.message.groupBy({
        by: ['senderId'],
        where: { senderId: { in: pairIds }, recipientId: userId, isRead: false },
        _count: { id: true },
      })
    : [];

  const unreadMap = new Map(unreadGroups.map(g => [g.senderId, g._count.id]));

  return rawConversations.map(({ msg, partnerId }) => ({
    sender:      msg.sender,
    recipient:   msg.recipient,
    lastMessage: msg,
    unreadCount: unreadMap.get(partnerId) ?? 0,
  }));
}

async function markMessagesAsRead(senderId, recipientId) {
  const result = await prisma.message.updateMany({
    where: { senderId, recipientId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
  cacheDel(`msg:unread:${recipientId}`).catch(() => {});
  return result;
}

async function getUnreadCount(userId) {
  return cacheWrap(
    `msg:unread:${userId}`,
    () => prisma.message.count({ where: { recipientId: userId, isRead: false } }),
    TTL.SHORT
  );
}

module.exports = {
  userExists,
  getDefaultAdmin,
  createMessage,
  getMessagesBetweenUsers,
  getConversations,
  markMessagesAsRead,
  getUnreadCount,
};
