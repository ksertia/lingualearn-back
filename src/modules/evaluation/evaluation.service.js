const { prisma } = require('../../config/prisma');

exports.submitEvaluation = async (data) => {
  // Nettoyage des sessions expirées (optionnel, peut être déplacé en tâche CRON)
  await prisma.discoverySession.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  // Enregistre le résultat d'évaluation pour un utilisateur (connecté) ou session découverte
  const evalData = {
    languageId: data.languageId,
    score: data.score,
    feedback: data.feedback,
    details: data.details || {},
  };
  if (data.userId) {
    evalData.userId = data.userId;
  } else if (data.sessionId) {
    evalData.sessionId = data.sessionId;
  }
  return await prisma.discoverResult.create({ data: evalData });
};

exports.getUserEvaluations = async (id) => {
  // Récupère tous les résultats d'évaluation d'un utilisateur (userId) ou d'une session découverte (sessionId)
  return await prisma.discoverResult.findMany({
    where: {
      OR: [
        { userId: id },
        { sessionId: id }
      ]
    },
    include: { language: true },
    orderBy: { createdAt: 'desc' }
  });
};
