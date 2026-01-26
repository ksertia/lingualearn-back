const { prisma } = require('../../config/prisma');

// Badges
async function createBadge(data) {
  return prisma.badge.create({ data });
}
async function getAllBadges() {
  return prisma.badge.findMany();
}
async function getBadgeById(id) {
  return prisma.badge.findUnique({ where: { id } });
}
async function updateBadge(id, data) {
  return prisma.badge.update({ where: { id }, data });
}
async function deleteBadge(id) {
  return prisma.badge.delete({ where: { id } });
}
// UserBadges
async function awardBadgeToUser(data) {
  return prisma.userBadge.create({ data });
}
async function getUserBadges(userId) {
  return prisma.userBadge.findMany({ where: { userId }, include: { badge: true } });
}

module.exports = {
  createBadge,
  getAllBadges,
  getBadgeById,
  updateBadge,
  deleteBadge,
  awardBadgeToUser,
  getUserBadges
};
