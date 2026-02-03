// Récupérer toutes les langues liées à un utilisateur (via userLanguageProgress)
exports.getLanguagesByUserId = async (userId) => {
       return await prisma.userLanguageProgress.findMany({
	       where: { userId },
	       include: { language: true }
       });
};

// Progression utilisateur pour Language
exports.selectLanguageForUser = async (userId, languageId) => {
       let progress = await prisma.userLanguageProgress.findUnique({ where: { userId_languageId: { userId, languageId } } });
       if (!progress) {
	       progress = await prisma.userLanguageProgress.create({ data: { userId, languageId, status: 'not_started' } });
       }
       return progress;
};

exports.startLanguageForUser = async (userId, languageId) => {
       return prisma.userLanguageProgress.update({
	       where: { userId_languageId: { userId, languageId } },
	       data: { status: 'started', startedAt: new Date() }
       });
};

exports.completeLanguageForUser = async (userId, languageId) => {
       return prisma.userLanguageProgress.update({
	       where: { userId_languageId: { userId, languageId } },
	       data: { status: 'completed', completedAt: new Date() }
       });
};
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (data) => {
	// Calcul automatique de l'index si non fourni
	let index = data.index;
	if (typeof index !== 'number' || isNaN(index)) {
		const max = await prisma.language.aggregate({ _max: { index: true } });
		index = (max._max.index ?? 0) + 1;
	}

	// Vérifier unicité de l'index
	const existingIndex = await prisma.language.findFirst({ where: { index } });
	if (existingIndex) {
		throw new Error('Une langue avec ce même index existe déjà.');
	}

	// Vérifier unicité du code
	if (data.code) {
		const existingCode = await prisma.language.findUnique({ where: { code: data.code } });
		if (existingCode) {
			throw new Error('Une langue avec ce code existe déjà.');
		}
	}

	return await prisma.language.create({ data: { ...data, index } });
};

exports.getAll = async () => {
	return await prisma.language.findMany({
		orderBy: { index: 'asc' },
		include: {
			levels: true
		}
	});
};

exports.getById = async (id) => {
	return await prisma.language.findUnique({ where: { id } });
};

exports.update = async (id, data) => {
	return await prisma.language.update({ where: { id }, data });
};

exports.remove = async (id) => {
	const language = await prisma.language.findUnique({ where: { id } });
	if (!language) return null;
	await prisma.language.delete({ where: { id } });
	return true;
};

