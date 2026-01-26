const { prisma } = require('../../config/prisma');

async function createStep(data) {
  return prisma.step.create({ data });
}

async function getAllSteps() {
  return prisma.step.findMany();
}

async function getStepById(id) {
  return prisma.step.findUnique({ where: { id } });
}

async function updateStep(id, data) {
  return prisma.step.update({ where: { id }, data });
}

async function deleteStep(id) {
  return prisma.step.delete({ where: { id } });
}

module.exports = {
  createStep,
  getAllSteps,
  getStepById,
  updateStep,
  deleteStep
};