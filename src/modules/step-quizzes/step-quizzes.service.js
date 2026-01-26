const { prisma } = require('../../config/prisma');

async function createStepQuiz(data) {
	return prisma.stepQuiz.create({ data });
}

async function getStepQuizById(id) {
	return prisma.stepQuiz.findUnique({ where: { id } });
}

async function updateStepQuiz(id, data) {
	return prisma.stepQuiz.update({ where: { id }, data });
}

async function deleteStepQuiz(id) {
	return prisma.stepQuiz.delete({ where: { id } });
}

module.exports = { createStepQuiz, getStepQuizById, updateStepQuiz, deleteStepQuiz };
