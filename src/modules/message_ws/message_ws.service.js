const { prisma } = require('../../config/prisma');

async function createMessage(data) {
  return prisma.message.create({ data });
}

async function getMessagesBetweenUsers(userA, userB) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userA, recipientId: userB },
        { senderId: userB, recipientId: userA }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });
}

module.exports = {
  createMessage,
  getMessagesBetweenUsers
};
