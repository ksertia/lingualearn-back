const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const quizId = 'cmluojel800wbau50mbyk0blp';
  const userId = 'cmmumuux670000ok449i15bjd1';
  const userAnswers = { question_0: 'A', question_1: 'B', question_2: 'C' };

  // Chercher le quiz
  let quiz = await p.quiz.findUnique({ where: { id: quizId }, include: { step: true } });
  if (!quiz) quiz = await p.quiz.findUnique({ where: { stepId: quizId }, include: { step: true } });

  console.log('Quiz trouvé:', quiz ? quiz.id : 'NULL');
  if (!quiz) return;

  // Compter les tentatives
  const attempts = await p.quizAttempt.count({ where: { quizId: quiz.id, userId } });
  console.log('Tentatives:', attempts, '/ max:', quiz.maxAttempts);

  // Simuler la création de tentative
  const attempt = await p.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId,
      quizType: 'step',
      attemptNumber: attempts + 1,
      answers: userAnswers,
      score: 50,
      passed: false,
      timeSpentSeconds: 0,
      status: 'failed',
      completedAt: new Date()
    }
  });
  console.log('Tentative créée:', attempt.id);
}

main().catch(e => console.error('ERREUR:', e.message)).finally(() => p.$disconnect());
