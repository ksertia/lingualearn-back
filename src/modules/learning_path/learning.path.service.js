const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

// Récupérer tous les parcours liés à un utilisateur (via userPathProgress)
async function getPathsByUserId(userId) {
       return prisma.userPathProgress.findMany({
	       where: { userId },
	       include: { path: true }
       });
}

// Progression utilisateur pour Path
async function selectPathForUser(userId, pathId) {
       let progress = await prisma.userPathProgress.findUnique({ where: { userId_pathId: { userId, pathId } } });
       if (!progress) {
	       progress = await prisma.userPathProgress.create({ data: { userId, pathId, status: 'locked' } });
       }
       return progress;
}

async function startPathForUser(userId, pathId) {
       return prisma.userPathProgress.update({
	       where: { userId_pathId: { userId, pathId } },
	       data: { status: 'started', startedAt: new Date() }
       });
}

async function completePathForUser(userId, pathId) {
       return prisma.userPathProgress.update({
	       where: { userId_pathId: { userId, pathId } },
	       data: { status: 'completed', completedAt: new Date() }
       });
}

// Compléter un parcours avec déblocage automatique du suivant
async function completePathWithAutoUnlock(userId, pathId) {
       return await progressionService.completePathAndUnlockNext(userId, pathId);
}

async function createPath(data) {
	return prisma.path.create({ data });
}

async function getAllPaths() {
	return prisma.path.findMany();
}

async function getPathById(id) {
	return prisma.path.findUnique({ where: { id } });
}

async function updatePath(id, data) {
	return prisma.path.update({ where: { id }, data });
}

async function deletePath(id) {
	return prisma.path.delete({ where: { id } });
}

module.exports = {
	createPath,
	getAllPaths,
	getPathById,
	updatePath,
	deletePath,
	getPathsByUserId,
	selectPathForUser,
	startPathForUser,
	completePathForUser,
	completePathWithAutoUnlock
};
