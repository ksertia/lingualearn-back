const { prisma } = require('../../config/prisma');
const progressionService = require('../progression/progression.service');
const { cacheDel } = require('../../utils/cache');
const { recordCoinTransaction } = require('../transaction/transaction.service');

async function createExercise(data) {
  const step = await prisma.step.findUnique({ where: { id: data.stepId } });
  if (!step) throw new Error('Step non trouvé');
  if (step.stepType !== 'exercise') {
    throw new Error(`Ce step est de type "${step.stepType}", un exercice ne peut être attaché qu'à un step de type "exercise"`);
  }

  const existing = await prisma.exercise.findUnique({ where: { stepId: data.stepId } });
  if (existing) throw new Error('Un exercice existe déjà pour ce step');

  return prisma.exercise.create({ data });
}

async function getExerciseById(id) {
  return prisma.exercise.findUnique({ where: { id } });
}

async function updateExercise(id, data) {
  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) throw new Error('Exercice non trouvé');
  return prisma.exercise.update({ where: { id }, data });
}

async function deleteExercise(id) {
  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) throw new Error('Exercice non trouvé');
  return prisma.exercise.delete({ where: { id } });
}

async function submitExerciseAnswer(exerciseId, userId, userAnswers) {
  // Fetch exercise + attempt count in parallel
  const [exercise, attempts] = await Promise.all([
    prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { step: { select: { id: true, pathId: true, index: true } } }
    }),
    prisma.exerciseAttempt.count({ where: { exerciseId, userId } })
  ]);

  if (!exercise) throw new Error('Exercice non trouvé');
  if (attempts >= exercise.maxAttempts) {
    throw new Error(`Nombre maximum de tentatives atteint (${exercise.maxAttempts})`);
  }

  // Score evaluation (pure computation — no DB)
  const correctAnswers = exercise.correctAnswers || {};
  let score = 0;
  const feedback = {};
  const totalQuestions = Object.keys(correctAnswers).length;

  for (const [key, correctAnswer] of Object.entries(correctAnswers)) {
    const userAnswer = userAnswers[key];
    const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
    if (isCorrect) score++;
    feedback[key] = { correct: isCorrect, userAnswer, correctAnswer: isCorrect ? null : correctAnswer };
  }

  const percentageScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const passed = percentageScore >= 70;

  const earnedXp    = passed ? exercise.xpReward    : Math.floor(exercise.xpReward    * (percentageScore / 100));
  const earnedCoins = passed ? exercise.coinReward  : Math.floor(exercise.coinReward  * (percentageScore / 100));

  // Persist attempt + stats in parallel (both unconditional)
  const attemptNumber = attempts + 1;

  const [attempt] = await Promise.all([
    prisma.exerciseAttempt.create({
      data: {
        exerciseId, userId,
        attemptNumber,
        answers: userAnswers,
        score: percentageScore,
        pointsEarned: earnedCoins,
        xpEarned: earnedXp,
        coinsEarned: earnedCoins,
        isCorrect: passed
      }
    }),
    (earnedXp > 0 || earnedCoins > 0) && prisma.userStats.upsert({
      where: { userId },
      create: { userId, totalXp: earnedXp, totalCoins: earnedCoins, totalExercisesCompleted: passed ? 1 : 0 },
      update: {
        totalXp: { increment: earnedXp },
        totalCoins: { increment: earnedCoins },
        ...(passed && { totalExercisesCompleted: { increment: 1 } })
      }
    })
  ]);

  // Marquer l'étape complétée et déclencher la cascade (recalcul + déblocage + notifications)
  let nextStepUnlocked = null;
  if (passed) {
    await prisma.userStepProgress.upsert({
      where: { userId_stepId: { userId, stepId: exercise.stepId } },
      update: { status: 'completed', progressPercentage: 100, score: percentageScore, completedAt: new Date() },
      create: { userId, stepId: exercise.stepId, status: 'completed', progressPercentage: 100, score: percentageScore, completedAt: new Date() }
    });

    try {
      await progressionService.completeStepAndUnlockNext(userId, exercise.stepId);
      // Récupérer l'étape suivante pour la réponse Flutter
      const nextStep = await prisma.step.findFirst({
        where: { pathId: exercise.step.pathId, index: { gt: exercise.step.index }, isActive: true },
        orderBy: { index: 'asc' }, select: { id: true, title: true, index: true }
      });
      if (nextStep) nextStepUnlocked = { id: nextStep.id, title: nextStep.title, index: nextStep.index };
    } catch (_) {}
  }

  cacheDel(`user:${userId}:state`, `gamification:user:${userId}:stats`).catch(() => {});

  if (earnedCoins > 0) {
    recordCoinTransaction({
      userId,
      amountCoins: earnedCoins,
      transactionType: 'coin_earn',
      description: `Exercice ${passed ? 'réussi' : 'complété'} : ${exercise.title} (score ${percentageScore}%)`,
      referenceType: 'exercise',
      referenceId: exerciseId
    }).catch(() => {});
  }

  return {
    attemptId: attempt.id,
    score: percentageScore, passed, correctAnswers: score, totalQuestions, feedback,
    rewards: { xp: earnedXp, coins: earnedCoins },
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
