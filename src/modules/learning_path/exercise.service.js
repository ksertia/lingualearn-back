const { prisma } = require('../../config/prisma');

async function createExercise(data) {
  return prisma.exercise.create({ data });
}

module.exports = { createExercise };