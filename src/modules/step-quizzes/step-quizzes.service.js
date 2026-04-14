const { prisma } = require('../../config/prisma');

async function createStepQuiz(data) {
	// Filtrer les champs non présents dans le modèle Quiz
	const { description, isActive, ...quizData } = data;
	return prisma.quiz.create({ data: quizData });
}

async function getStepQuizById(id) {
	return prisma.quiz.findUnique({ where: { id } });
}

async function updateStepQuiz(id, data) {
	return prisma.quiz.update({ where: { id }, data });
}

async function deleteStepQuiz(id) {
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

	// 5. Mettre à jour la progression de l'étape si réussi
	let nextStepUnlocked = null;
	if (passed) {
		const stepProgress = await prisma.userStepProgress.findUnique({
			where: {
				userId_stepId: {
					userId,
					stepId: quiz.stepId
				}
			}
		});

		if (stepProgress) {
			await prisma.userStepProgress.update({
				where: {
					userId_stepId: {
						userId,
						stepId: quiz.stepId
					}
				},
				data: {
					status: 'completed',
					progress: 100,
					score: percentageScore,
					completedAt: new Date()
				}
			});

			// DÉBLOCAGE AUTOMATIQUE - Débloquer l'étape suivante
			try {
				const nextStep = await prisma.step.findFirst({
					where: {
						pathId: quiz.step.pathId,
						index: { gt: quiz.step.index }
					},
					orderBy: { index: 'asc' }
				});

				if (nextStep) {
					await prisma.userStepProgress.upsert({
						where: {
							userId_stepId: {
								userId,
								stepId: nextStep.id
							}
						},
						update: {
							status: 'unlocked',
							unlockedAt: new Date()
						},
						create: {
							userId,
							stepId: nextStep.id,
							status: 'unlocked',
							unlockedAt: new Date()
						}
					});
					
					nextStepUnlocked = {
						id: nextStep.id,
						title: nextStep.title,
						index: nextStep.index
					};
				} else {
					// Toutes les étapes complétées, marquer le parcours comme complété
					await prisma.userPathProgress.update({
						where: {
							userId_pathId: {
								userId,
								pathId: quiz.step.pathId
							}
						},
						data: {
							status: 'completed',
							completedAt: new Date()
						}
					});
				}
			} catch (error) {
				console.error('Erreur lors du déblocage de l\'étape suivante:', error);
			}
		}
	}

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
