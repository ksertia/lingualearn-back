/**
 * Middleware pour garantir que tous les utilisateurs créés sont actifs par défaut
 * Applique les valeurs par défaut cohérentes lors de la création
 */
const ensureUserActiveDefaults = (req, res, next) => {
  // Si c'est une route de création d'utilisateur
  if (req.path.includes('/auth/register') || req.path.includes('/users')) {
    // Pour les requêtes POST (création)
    if (req.method === 'POST' && req.body) {
      // Forcer les valeurs par défaut si elles ne sont pas spécifiées
      if (req.body.isActive === undefined) {
        req.body.isActive = true;
      }
      if (req.body.isVerified === undefined) {
        req.body.isVerified = true;
      }
      if (req.body.firstLogin === undefined) {
        req.body.firstLogin = true;
      }
    }
  }
  
  next();
};

module.exports = ensureUserActiveDefaults;
