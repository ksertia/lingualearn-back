const { prisma } = require('../../config/prisma');

async function createLearningPath(data) {
	return prisma.learningPath.create({ data });
}

async function getAllLearningPaths() {
	return prisma.learningPath.findMany();
}

async function getLearningPathById(id) {
	return prisma.learningPath.findUnique({ where: { id } });
}

async function updateLearningPath(id, data) {
	return prisma.learningPath.update({ where: { id }, data });
}

async function deleteLearningPath(id) {
	return prisma.learningPath.delete({ where: { id } });
}

module.exports = {
	createLearningPath,
	getAllLearningPaths,
	getLearningPathById,
	updateLearningPath,
	deleteLearningPath
};
