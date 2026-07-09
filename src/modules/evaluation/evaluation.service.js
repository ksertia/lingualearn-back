const { prisma } = require('../../config/prisma');

// Les modèles discoverySession / discoverResult n'existent pas dans le schéma actuel.
// Ces endpoints ne sont pas encore utilisés — ils retournent une erreur explicite.

exports.submitEvaluation = async (data) => {
  throw new Error('Module évaluation non implémenté dans cette version.');
};

exports.getUserEvaluations = async (id) => {
  throw new Error('Module évaluation non implémenté dans cette version.');
};
