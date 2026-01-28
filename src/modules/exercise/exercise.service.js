const { prisma } = require('../../config/prisma');

async function createExercise(data) {
	return prisma.exercise.create({ data });
}

async function getExerciseById(id) {
	return prisma.exercise.findUnique({ where: { id } });
}

async function updateExercise(id, data) {
	return prisma.exercise.update({ where: { id }, data });
}

async function deleteExercise(id) {
	return prisma.exercise.delete({ where: { id } });
}

module.exports = { createExercise, getExerciseById, updateExercise, deleteExercise };
