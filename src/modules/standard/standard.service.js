const { prisma } = require('../../config/prisma');
const { AppError } = require('../../middleware/errorHandler');

const ITEM_FIELDS = {
	id: true, type: true, term: true, translation: true, example: true, exampleTranslation: true,
	audioUrl: true, question: true, options: true, answerIndex: true, sentence: true,
	answerWords: true, distractors: true, fromFrench: true
};

function toSessionPayload(session) {
	return {
		id: session.id,
		title: session.title,
		estimatedMinutes: session.estimatedMinutes,
		items: session.items.map((item) => ({ ...item }))
	};
}

// Renvoie la session publiée à `position`, ou la suivante publiée si celle-ci
// ne l'est pas. Boucle sur la première session publiée si on dépasse le
// catalogue (comportement actuel de l'app : pas de blocage en fin de parcours).
async function findPublishedSessionFrom(languageId, position) {
	let session = await prisma.standardSession.findFirst({
		where: { languageId, isPublished: true, position: { gte: position } },
		orderBy: { position: 'asc' },
		include: { items: { orderBy: { position: 'asc' }, select: ITEM_FIELDS } }
	});

	if (!session) {
		session = await prisma.standardSession.findFirst({
			where: { languageId, isPublished: true },
			orderBy: { position: 'asc' },
			include: { items: { orderBy: { position: 'asc' }, select: ITEM_FIELDS } }
		});
	}

	return session;
}

async function getOrCreateProgress(userId, languageId) {
	let progress = await prisma.standardProgress.findUnique({ where: { userId_languageId: { userId, languageId } } });
	if (!progress) {
		progress = await prisma.standardProgress.create({ data: { userId, languageId, nextPosition: 1 } });
	}
	return progress;
}

async function assertLanguageExists(languageId) {
	const language = await prisma.language.findUnique({ where: { id: languageId }, select: { id: true } });
	if (!language) throw new AppError(404, 'Langue inconnue.', true, 'STANDARD_NOT_FOUND');
}

exports.getNextSession = async (languageId, userId) => {
	await assertLanguageExists(languageId);
	const progress = await getOrCreateProgress(userId, languageId);
	const session = await findPublishedSessionFrom(languageId, progress.nextPosition);
	if (!session) throw new AppError(404, 'Aucune session publiée pour cette langue.', true, 'STANDARD_NO_CONTENT');
	return toSessionPayload(session);
};

exports.getNextSessionPreview = async (languageId, userId) => {
	await assertLanguageExists(languageId);
	const progress = await getOrCreateProgress(userId, languageId);
	const session = await findPublishedSessionFrom(languageId, progress.nextPosition);
	if (!session) throw new AppError(404, 'Aucune session publiée pour cette langue.', true, 'STANDARD_NO_CONTENT');

	return {
		id: session.id,
		title: session.title,
		estimatedMinutes: session.estimatedMinutes,
		cardCount: session.items.filter((i) => i.type === 'vocabulary' || i.type === 'phrase').length,
		exerciseCount: session.items.filter((i) => i.type === 'quiz' || i.type === 'translate').length
	};
};

function computeStars(correctAnswers, exerciseCount) {
	if (exerciseCount === 0) return 3;
	if (correctAnswers === exerciseCount) return 3;
	if (correctAnswers >= exerciseCount / 2) return 2;
	return 1;
}

exports.completeSession = async (sessionId, { userId, languageId, correctAnswers, exerciseCount, durationSeconds, requestId }) => {
	// Idempotence : un requestId déjà enregistré renvoie le résultat existant
	// sans recréer de ligne ni avancer le curseur une deuxième fois.
	const existing = await prisma.standardSessionResult.findUnique({ where: { requestId } });
	if (existing) {
		const nextSession = await exports.getNextSessionPreview(existing.languageId, existing.userId);
		return { resultId: existing.id, nextSession };
	}

	const session = await prisma.standardSession.findUnique({ where: { id: sessionId } });
	if (!session || session.languageId !== languageId) {
		throw new AppError(404, 'Session inconnue.', true, 'STANDARD_NOT_FOUND');
	}

	const stars = computeStars(correctAnswers, exerciseCount);

	const result = await prisma.$transaction(async (tx) => {
		const created = await tx.standardSessionResult.create({
			data: { userId, languageId, sessionId, requestId, correctAnswers, exerciseCount, durationSeconds, stars }
		});

		await tx.standardProgress.upsert({
			where: { userId_languageId: { userId, languageId } },
			update: { nextPosition: session.position + 1 },
			create: { userId, languageId, nextPosition: session.position + 1 }
		});

		return created;
	});

	const nextSession = await exports.getNextSessionPreview(languageId, userId);
	return { resultId: result.id, nextSession };
};

exports.getUserLanguageStats = async (userId, languageId) => {
	await assertLanguageExists(languageId);

	const results = await prisma.standardSessionResult.findMany({
		where: { userId, languageId },
		orderBy: { completedAt: 'desc' }
	});

	const sessionIds = [...new Set(results.map((r) => r.sessionId))];
	const sessionsCompleted = sessionIds.length;

	const wordsLearned = sessionIds.length
		? await prisma.standardItem.count({
			where: {
				sessionId: { in: sessionIds },
				type: { in: ['vocabulary', 'phrase'] }
			}
		})
		: 0;

	const correctAnswers = results.reduce((sum, r) => sum + r.correctAnswers, 0);
	const exerciseCount = results.reduce((sum, r) => sum + r.exerciseCount, 0);

	return {
		sessionsCompleted,
		wordsLearned,
		correctAnswers,
		exerciseCount,
		lastCompletedAt: results[0]?.completedAt ?? null
	};
};

exports.getChildLanguageStats = async (parentId, childId, languageId) => {
	const child = await prisma.user.findFirst({ where: { id: childId, parentId, accountType: 'sub_account_learner' } });
	if (!child) throw new AppError(404, 'Compte enfant introuvable ou ne vous appartenant pas.');
	return exports.getUserLanguageStats(childId, languageId);
};

// ==================== ADMINISTRATION ====================

exports.listSessionsForAdmin = async (languageId) => {
	return prisma.standardSession.findMany({
		where: { languageId },
		orderBy: { position: 'asc' },
		include: { items: { orderBy: { position: 'asc' }, select: ITEM_FIELDS } }
	});
};

exports.createSession = async ({ languageId, position, title, estimatedMinutes, items }) => {
	await assertLanguageExists(languageId);

	const existing = await prisma.standardSession.findUnique({ where: { languageId_position: { languageId, position } } });
	if (existing) throw new AppError(400, `Une session existe déjà à la position ${position} pour cette langue.`);

	return prisma.standardSession.create({
		data: {
			languageId, position, title, estimatedMinutes,
			items: { create: items.map((item, index) => ({ ...item, position: index + 1 })) }
		},
		include: { items: { orderBy: { position: 'asc' }, select: ITEM_FIELDS } }
	});
};

exports.updateSession = async (id, { languageId, position, title, estimatedMinutes, items }) => {
	const session = await prisma.standardSession.findUnique({ where: { id } });
	if (!session) throw new AppError(404, 'Session introuvable.', true, 'STANDARD_NOT_FOUND');

	if (languageId) await assertLanguageExists(languageId);

	if (position && position !== session.position) {
		const clash = await prisma.standardSession.findUnique({
			where: { languageId_position: { languageId: languageId ?? session.languageId, position } }
		});
		if (clash && clash.id !== id) throw new AppError(400, `Une session existe déjà à la position ${position} pour cette langue.`);
	}

	return prisma.$transaction(async (tx) => {
		if (items) {
			await tx.standardItem.deleteMany({ where: { sessionId: id } });
		}

		return tx.standardSession.update({
			where: { id },
			data: {
				...(languageId !== undefined && { languageId }),
				...(position !== undefined && { position }),
				...(title !== undefined && { title }),
				...(estimatedMinutes !== undefined && { estimatedMinutes }),
				// Toute modification du contenu annule la relecture précédente.
				...(items !== undefined && { reviewedBy: null, reviewedAt: null, isPublished: false }),
				...(items && { items: { create: items.map((item, index) => ({ ...item, position: index + 1 })) } })
			},
			include: { items: { orderBy: { position: 'asc' }, select: ITEM_FIELDS } }
		});
	});
};

exports.setPublishStatus = async (id, isPublished, reviewerName) => {
	const session = await prisma.standardSession.findUnique({ where: { id } });
	if (!session) throw new AppError(404, 'Session introuvable.', true, 'STANDARD_NOT_FOUND');

	if (isPublished && !session.reviewedBy) {
		if (!reviewerName) throw new AppError(400, 'Une session ne peut être publiée qu\'après relecture par un locuteur natif (reviewedBy requis).');
		return prisma.standardSession.update({
			where: { id },
			data: { isPublished: true, reviewedBy: reviewerName, reviewedAt: new Date() }
		});
	}

	return prisma.standardSession.update({ where: { id }, data: { isPublished } });
};

exports.reorderSessions = async (languageId, order) => {
	await assertLanguageExists(languageId);

	const sessions = await prisma.standardSession.findMany({ where: { languageId }, select: { id: true } });
	const knownIds = new Set(sessions.map((s) => s.id));
	if (order.length !== sessions.length || !order.every((id) => knownIds.has(id))) {
		throw new AppError(400, 'order doit contenir exactement les ids des sessions existantes de cette langue.');
	}

	// Décalage temporaire au-delà des positions existantes pour éviter toute
	// collision sur la contrainte unique (languageId, position) pendant le swap.
	await prisma.$transaction(async (tx) => {
		await Promise.all(order.map((id, index) => tx.standardSession.update({ where: { id }, data: { position: 1000 + index } })));
		await Promise.all(order.map((id, index) => tx.standardSession.update({ where: { id }, data: { position: index + 1 } })));
	});

	return exports.listSessionsForAdmin(languageId);
};

exports.setItemAudioUrl = async (itemId, audioUrl) => {
	const item = await prisma.standardItem.findUnique({ where: { id: itemId } });
	if (!item) throw new AppError(404, 'Item introuvable.', true, 'STANDARD_NOT_FOUND');
	return prisma.standardItem.update({ where: { id: itemId }, data: { audioUrl } });
};
