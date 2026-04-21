const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');

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

// Soumettre et valider les réponses d'un exercice
async function submitExerciseAnswer(exerciseId, userId, userAnswers) {
	// 1. Récupérer l'exercice avec les réponses correctes
	const exercise = await prisma.exercise.findUnique({
		where: { id: exerciseId },
		include: {
			step: true
		}
	});

	if (!exercise) {
		throw new Error('Exercice non trouvé');
	}

	// 2. Vérifier le nombre de tentatives
	const attempts = await prisma.exerciseAttempt.count({
		where: { exerciseId, userId }
	});

	if (attempts >= exercise.maxAttempts) {
		throw new Error(`Nombre maximum de tentatives atteint (${exercise.maxAttempts})`);
	}

	// 3. Valider les réponses
	const correctAnswers = exercise.correctAnswers || {};
	let score = 0;
	let totalQuestions = 0;
	const feedback = {};

	// Comparer les réponses utilisateur avec les réponses correctes
	if (typeof correctAnswers === 'object') {
		totalQuestions = Object.keys(correctAnswers).length;
		
		for (const [key, correctAnswer] of Object.entries(correctAnswers)) {
			const userAnswer = userAnswers[key];
			const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
			
			if (isCorrect) {
				score++;
			}
			
			feedback[key] = {
				correct: isCorrect,
				userAnswer,
				correctAnswer: isCorrect ? null : correctAnswer // Ne montrer la réponse correcte que si faux
			};
		}
	}

	const percentageScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
	const passed = percentageScore >= 70; // 70% pour réussir

	// 4. Enregistrer la tentative
	const attempt = await prisma.exerciseAttempt.create({
		data: {
			exerciseId,
			userId,
			answers: userAnswers,
			score: percentageScore,
			passed,
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
					stepId: exercise.stepId
				}
			}
		});

		if (stepProgress) {
			await prisma.userStepProgress.update({
				where: {
					userId_stepId: {
						userId,
						stepId: exercise.stepId
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
						pathId: exercise.step.pathId,
						index: { gt: exercise.step.index }
					},
					orderBy: { index: 'asc' }
				});

				if (nextStep) {
					await prisma.userStepProgress.upsert({
						where: { userId_stepId: { userId, stepId: nextStep.id } },
						update: { status: 'unlocked', unlockedAt: new Date() },
						create: { userId, stepId: nextStep.id, status: 'unlocked', unlockedAt: new Date() }
					});

					// Recalculer les pourcentages après completion de l'étape
					await progressionService.handleStepProgressRecalculation(userId, exercise.step.pathId);

					nextStepUnlocked = {
						id: nextStep.id,
						title: nextStep.title,
						index: nextStep.index
					};
				} else {
					// Toutes les étapes complétées → cascade automatique (path → module → level → language)
					await progressionService.handlePathCompletion(userId, exercise.step.pathId);
				}
			} catch (error) {
				console.error('Erreur lors du déblocage de l\'étape suivante:', error);
			}
		}
	}

	// 6. Calculer les récompenses
	const earnedXp = passed ? exercise.xpReward : Math.floor(exercise.xpReward * (percentageScore / 100));
	const earnedCoins = passed ? exercise.coinReward : Math.floor(exercise.coinReward * (percentageScore / 100));

	// Mettre à jour les stats utilisateur
	if (earnedXp > 0 || earnedCoins > 0) {
		await prisma.userStats.upsert({
			where: { userId },
			create: {
				userId,
				totalXp: earnedXp,
				totalCoins: earnedCoins,
				totalExercisesCompleted: passed ? 1 : 0
			},
			update: {
				totalXp: { increment: earnedXp },
				totalCoins: { increment: earnedCoins },
				totalExercisesCompleted: passed ? { increment: 1 } : undefined
			}
		});
	}

	return {
		attemptId: attempt.id,
		score: percentageScore,
		passed,
		correctAnswers: score,
		totalQuestions,
		feedback,
		rewards: {
			xp: earnedXp,
			coins: earnedCoins
		},
		attemptsUsed: attempts + 1,
		attemptsRemaining: exercise.maxAttempts - (attempts + 1),
		explanation: exercise.explanation,
		nextStepUnlocked,
		message: nextStepUnlocked 
			? `Exercice réussi ! Étape suivante débloquée : ${nextStepUnlocked.title}` 
			: passed ? 'Exercice réussi !' : 'Exercice échoué, réessayez !'
	};
}

module.exports = { createExercise, getExerciseById, updateExercise, deleteExercise, submitExerciseAnswer };
