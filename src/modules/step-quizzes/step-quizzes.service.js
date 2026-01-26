const { prisma } = require('../../config/prisma');

async function createStepQuiz(data) {
	return prisma.stepQuiz.create({ data });
}

module.exports = { createStepQuiz };
