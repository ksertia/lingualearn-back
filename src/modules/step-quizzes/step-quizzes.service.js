const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheDel } = require('../../utils/cache');

async function createStepQuiz(data) {
	const step = await prisma.step.findUnique({ where: { id: data.stepId } });
	if (!step) throw new Error('Step non trouvé');
	if (step.stepType !== 'quiz') {
		throw new Error(`Ce step est de type "${step.stepType}", un quiz ne peut être attaché qu'à un step de type "quiz"`);
	}

	const existing = await prisma.quiz.findUnique({ where: { stepId: data.stepId } });
	if (existing) throw new Error('Un quiz existe déjà pour ce step');

	// Filtrer les champs non présents dans le modèle Quiz
	const { description, isActive, ...quizData } = data;
	return prisma.quiz.create({ data: quizData });
}

async function getStepQuizById(id) {
	return prisma.quiz.findUnique({ where: { id } });
}

async function updateStepQuiz(id, data) {
	const existing = await prisma.quiz.findUnique({ where: { id } });
	if (!existing) throw new Error('Quiz non trouvé');

	// Filtrer les champs non présents dans le modèle Quiz
	const { description, isActive, ...quizData } = data;
	return prisma.quiz.update({ where: { id }, data: quizData });
}

async function deleteStepQuiz(id) {
	const existing = await prisma.quiz.findUnique({ where: { id } });
	if (!existing) throw new Error('Quiz non trouvé');
	return prisma.quiz.delete({ where: { id } });
}

// Soumettre et valider les réponses d'un quiz
async function submitQuizAnswer(quizId, userId, userAnswers) {
	// 1. Récupérer le quiz (par son id ou par stepId)
	let quiz = await prisma.quiz.findUnique({
		where: { id: quizId },
		include: { step: true }
	});

	if (!quiz) {
		quiz = await prisma.quiz.findUnique({
			where: { stepId: quizId },
			include: { step: true }
		});
	}

	if (!quiz) {
		throw new Error('Quiz non trouvé');
	}

	// 2. Vérifier le nombre de tentatives
	const attempts = await prisma.quizAttempt.count({
		where: { quizId: quiz.id, userId }
	});

	if (attempts >= quiz.maxAttempts) {
		throw new Error(`Nombre maximum de tentatives atteint (${quiz.maxAttempts})`);
	}

	// 3. Valider les réponses
	const questions = quiz.questions || [];
	let score = 0;
	let totalQuestions = questions.length;
	const feedback = [];

	questions.forEach((question, index) => {
		const userAnswer = userAnswers[`question_${index}`] || userAnswers[index];
		const correctAnswer = question.correctAnswer;
		const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
		
		if (isCorrect) {
			score++;
		}
		
		feedback.push({
			questionIndex: index,
			question: question.question,
			correct: isCorrect,
			userAnswer,
			correctAnswer: isCorrect ? null : correctAnswer,
			explanation: question.explanation || null
		});
	});

	const percentageScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
	const passed = percentageScore >= quiz.passingScore;

	// 4. Enregistrer la tentative
	const attempt = await prisma.quizAttempt.create({
		data: {
			quizId: quiz.id,
			userId,
			quizType: 'step',
			attemptNumber: attempts + 1,
			answers: userAnswers,
			score: percentageScore,
			passed,
			timeSpentSeconds: 0,
			status: passed ? 'passed' : 'failed',
			completedAt: new Date()
		}
	});

	// 5. Marquer l'étape complétée et déclencher la cascade (recalcul + déblocage + notifications)
	let nextStepUnlocked = null;
	if (passed) {
		await prisma.userStepProgress.upsert({
			where: { userId_stepId: { userId, stepId: quiz.stepId } },
			update: { status: 'completed', progressPercentage: 100, score: percentageScore, completedAt: new Date() },
			create: { userId, stepId: quiz.stepId, status: 'completed', progressPercentage: 100, score: percentageScore, completedAt: new Date() }
		});

		try {
			await progressionService.completeStepAndUnlockNext(userId, quiz.stepId);
			const nextStep = await prisma.step.findFirst({
				where: { pathId: quiz.step.pathId, index: { gt: quiz.step.index }, isActive: true },
				orderBy: { index: 'asc' }, select: { id: true, title: true, index: true }
			});
			if (nextStep) nextStepUnlocked = { id: nextStep.id, title: nextStep.title, index: nextStep.index };
		} catch (_) {}
	}

	cacheDel(`user:${userId}:state`, `gamification:user:${userId}:stats`).catch(() => {});

	// 6. Calculer les récompenses
	const earnedXp = passed ? quiz.xpReward : Math.floor(quiz.xpReward * (percentageScore / 100));
	const earnedCoins = passed ? quiz.coinReward : Math.floor(quiz.coinReward * (percentageScore / 100));

	// Mettre à jour les stats utilisateur
	if (earnedXp > 0 || earnedCoins > 0) {
		await prisma.userStats.upsert({
			where: { userId },
			create: {
				userId,
				totalXp: earnedXp,
				totalCoins: earnedCoins,
				totalStepsCompleted: passed ? 1 : 0
			},
			update: {
				totalXp: { increment: earnedXp },
				totalCoins: { increment: earnedCoins },
				...(passed ? { totalStepsCompleted: { increment: 1 } } : {})
			}
		});
	}

	return {
		attemptId: attempt.id,
		score: percentageScore,
		passed,
		correctAnswers: score,
		totalQuestions,
		passingScore: quiz.passingScore,
		feedback,
		rewards: {
			xp: earnedXp,
			coins: earnedCoins
		},
		attemptsUsed: attempts + 1,
		attemptsRemaining: quiz.maxAttempts - (attempts + 1),
		timeTaken: quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} minutes` : null,
		nextStepUnlocked,
		message: nextStepUnlocked 
			? `Quiz réussi ! Étape suivante débloquée : ${nextStepUnlocked.title}` 
			: passed ? 'Quiz réussi !' : 'Quiz échoué, réessayez !'
	};
}

module.exports = { createStepQuiz, getStepQuizById, updateStepQuiz, deleteStepQuiz, submitQuizAnswer };
