const languageService = require('../language/language.service');

exports.getLanguagesForDiscover = async () => {
  // Utilise le service de langue pour récupérer toutes les langues
  return await languageService.getAll();
};

// Placeholder pour ajouter d'autres fonctionnalités de découverte (exercices, etc.)
exports.getExercisesForDiscover = async () => {
  // À implémenter : retourner des exercices de découverte
  return [];
};
