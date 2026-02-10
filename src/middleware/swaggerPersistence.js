/**
 * Middleware pour la persistance de l'authentification dans Swagger UI
 * Assure que les tokens et cookies sont conservés après rafraîchissement
 */
function swaggerPersistenceMiddleware(req, res, next) {
  // Headers pour permettre la persistance des données d'authentification
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Permettre les cookies pour la persistance
  if (req.path.includes('/api-docs')) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  next();
}

module.exports = swaggerPersistenceMiddleware;
