const { prisma } = require('../../config/prisma');
const { recalculateFullChain } = require('../progress/progress.service');

exports.createEvaluation = async (data) => {
  const subTheme = await prisma.subTheme.findUnique({ where: { id: data.subThemeId } });
  if (!subTheme) throw new Error('Sous-thème non trouvé');

  const existing = await prisma.evaluation.findUnique({ where: { subThemeId: data.subThemeId } });
  if (existing) throw new Error('Une évaluation existe déjà pour ce sous-thème');

  return prisma.evaluation.create({ data: { ...data, isActive: true } });
};

exports.getEvaluation = async (id) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });
  if (!evaluation) throw new Error('Évaluation non trouvée');
  return evaluation;
};

exports.getEvaluationBySubThemeId = async (subThemeId) => {
  return prisma.evaluation.findUnique({ where: { subThemeId } });
};

exports.updateEvaluation = async (id, data) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });
  if (!evaluation) throw new Error('Évaluation non trouvée');
  return prisma.evaluation.update({ where: { id }, data });
};

exports.deleteEvaluation = async (id) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id } });
  if (!evaluation) throw new Error('Évaluation non trouvée');
  return prisma.evaluation.delete({ where: { id } });
};

exports.submitEvaluation = async (evaluationId, userId, userAnswers) => {
  const evaluation = await prisma.evaluation.findUnique({ where: { id: evaluationId } });
  if (!evaluation) throw new Error('Évaluation non trouvée');

  const attemptsCount = await prisma.evaluationAttempt.count({ where: { evaluationId, userId } });
  if (attemptsCount >= evaluation.maxAttempts) {
    throw new Error(`Nombre maximum de tentatives atteint (${evaluation.maxAttempts})`);
  }

  const questions = evaluation.questions || [];
  let score = 0;
  const feedback = [];

  questions.forEach((q, index) => {
    const userAnswer = userAnswers[`question_${index}`] ?? userAnswers[index];
    const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(q.correctAnswer);
    if (isCorrect) score++;
    feedback.push({ questionIndex: index, question: q.question, correct: isCorrect, userAnswer, correctAnswer: isCorrect ? null : q.correctAnswer, explanation: q.explanation || null });
  });

  const percentageScore = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const passed = percentageScore >= evaluation.passingScore;

  const attempt = await prisma.evaluationAttempt.create({
    data: {
      evaluationId, userId,
      attemptNumber: attemptsCount + 1,
      answers: userAnswers,
      score: percentageScore,
      passed,
      feedback
    }
  });

  await recalculateFullChain(userId, evaluation.subThemeId, { evaluationScore: percentageScore }).catch(() => {});

  return {
    attemptId: attempt.id,
    score: percentageScore, passed, correctAnswers: score, totalQuestions: questions.length,
    passingScore: evaluation.passingScore,
    feedback,
    attemptsUsed: attemptsCount + 1,
    attemptsRemaining: evaluation.maxAttempts - (attemptsCount + 1),
    message: passed ? 'Évaluation réussie !' : 'Évaluation échouée, réessayez !'
  };
};
