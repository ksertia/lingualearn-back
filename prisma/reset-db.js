const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  Suppression de toutes les données...');

  // Ordre important : supprimer les enfants avant les parents
  await prisma.accountReport.deleteMany();
  await prisma.userDailyActivity.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userCertificate.deleteMany();
  await prisma.userQuizProgress.deleteMany();
  await prisma.userExerciseProgress.deleteMany();
  await prisma.userStepProgress.deleteMany();
  await prisma.userPathProgress.deleteMany();
  await prisma.userModuleProgress.deleteMany();
  await prisma.userLevelProgress.deleteMany();
  await prisma.userLanguageProgress.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.exerciseAttempt.deleteMany();
  await prisma.userStats.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userCertificate.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.paymentRequest.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subAccountControl.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // Contenu pédagogique
  await prisma.discoverOption.deleteMany();
  await prisma.discoverContent.deleteMany();
  await prisma.discoverSection.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.pathQuiz.deleteMany();
  await prisma.step.deleteMany();
  await prisma.path.deleteMany();
  await prisma.module.deleteMany();
  await prisma.level.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.language.deleteMany();

  // Plans et paramètres
  await prisma.subscriptionPlan.deleteMany();
  await prisma.appSetting.deleteMany();

  console.log('✅ Base de données vidée.');
}

main()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
