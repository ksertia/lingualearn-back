const { prisma } = require('../../config/prisma');

async function createCourse(data) {
	return prisma.course.create({ data });
}

// Ajoute ici d'autres fonctions CRUD si besoin

module.exports = {
	createCourse
};
