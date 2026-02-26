const languageService = require('../language/language.service');

exports.getLanguagesForDiscover = async () => {
  // Récupère toutes les langues
  const allLanguages = await languageService.getAll();
  
  // Pour chaque langue, ne garder que le niveau intermédiaire
  const languagesWithOnlyIntermediate = allLanguages
    .filter(language => language.levels && language.levels.some(level => level.code === 'intermediate'))
    .map(language => ({
      ...language,
      // Remplacer tous les niveaux par seulement le niveau intermédiaire
      levels: language.levels.filter(level => level.code === 'intermediate')
    }));
  
  return languagesWithOnlyIntermediate;
};

// Placeholder pour ajouter d'autres fonctionnalités de découverte (exercices, etc.)
exports.getExercisesForDiscover = async () => {
  // À implémenter : retourner des exercices de découverte
  return [];
};