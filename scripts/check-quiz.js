const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const stepId = 'cmluojel800wbau50mbyk0blp';

  // Vérifier si un quiz existe déjà pour ce step
  const existing = await p.quiz.findUnique({ where: { stepId } });
  if (existing) {
    console.log('Quiz déjà existant:', JSON.stringify(existing, null, 2));
    return;
  }

  // Créer le quiz
  const quiz = await p.quiz.create({
    data: {
      stepId,
      title: 'Quiz sur la grammaire',
      questions: [
        { question: 'Question A', options: ['1', '2', '3'], correctAnswer: '1' },
        { question: 'Question B', options: ['1', '2', '3'], correctAnswer: '2' },
        { question: 'Question C', options: ['1', '2', '3'], correctAnswer: '3' }
      ],
      passingScore: 70,
      maxAttempts: 2,
      timeLimitMinutes: 10,
      xpReward: 30,
      coinReward: 15
    }
  });

  console.log('Quiz créé avec succès:');
  console.log('  id:', quiz.id);
  console.log('  stepId:', quiz.stepId);
  console.log('  title:', quiz.title);
}

main().finally(() => p.$disconnect());
