const progressionService = require('../modules/progression/progression.service');
const { prisma } = require('../config/prisma');

/**
 * Middleware qui vérifie si un utilisateur peut accéder à un élément
 * et initialise automatiquement la progression si nécessaire
 */
const checkProgressionAccess = (elementType) => {
  return async (req, res, next) => {
    try {
      const { userId } = req.params;
      const elementId = req.params[`${elementType}Id`] || req.params.id;
      
      if (!userId || !elementId) {
        return res.status(400).json({
          success: false,
          error: 'userId et elementId sont requis'
        });
      }

      // Vérifier si l'utilisateur existe
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Utilisateur non trouvé'
        });
      }

      // Récupérer l'élément et vérifier s'il est actif
      let element;
      switch (elementType) {
        case 'level':
          element = await prisma.level.findUnique({ 
            where: { id: elementId },
            include: { language: true }
          });
          break;
        case 'module':
          element = await prisma.module.findUnique({ 
            where: { id: elementId },
            include: { level: { include: { language: true } } }
          });
          break;
        case 'path':
          element = await prisma.path.findUnique({ 
            where: { id: elementId },
            include: { 
              module: { 
                include: { 
                  level: { include: { language: true } } 
                } 
              } 
            }
          });
          break;
        case 'step':
          element = await prisma.step.findUnique({ 
            where: { id: elementId },
            include: { 
              path: { 
                include: { 
                  module: { 
                    include: { 
                      level: { include: { language: true } } 
                    } 
                  } 
                } 
              } 
            }
          });
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Type d\'élément non valide'
          });
      }

      if (!element) {
        return res.status(404).json({
          success: false,
          error: `${elementType} non trouvé`
        });
      }

      if (!element.isActive) {
        return res.status(403).json({
          success: false,
          error: `${elementType} n'est pas actif`
        });
      }

      // Initialiser automatiquement la progression de la langue si nécessaire
      let languageId;
      switch (elementType) {
        case 'level':
          languageId = element.languageId;
          break;
        case 'module':
          languageId = element.level.languageId;
          break;
        case 'path':
          languageId = element.module.level.languageId;
          break;
        case 'step':
          languageId = element.path.module.level.languageId;
          break;
      }

      await progressionService.initializeUserLanguageProgress(userId, languageId);

      // Vérifier la progression de l'utilisateur pour cet élément
      let progress;
      switch (elementType) {
        case 'level':
          progress = await prisma.userLevelProgress.findUnique({
            where: { userId_levelId: { userId, levelId: elementId } }
          });
          break;
        case 'module':
          progress = await prisma.userModuleProgress.findUnique({
            where: { userId_moduleId: { userId, moduleId: elementId } }
          });
          break;
        case 'path':
          progress = await prisma.userPathProgress.findUnique({
            where: { userId_pathId: { userId, pathId: elementId } }
          });
          break;
        case 'step':
          progress = await prisma.userStepProgress.findUnique({
            where: { userId_stepId: { userId, stepId: elementId } }
          });
          break;
      }

      // Si aucune progression n'existe, la créer comme "locked"
      if (!progress) {
        switch (elementType) {
          case 'level':
            progress = await prisma.userLevelProgress.create({
              data: { userId, levelId: elementId, status: 'locked' }
            });
            break;
          case 'module':
            progress = await prisma.userModuleProgress.create({
              data: { userId, moduleId: elementId, status: 'locked' }
            });
            break;
          case 'path':
            progress = await prisma.userPathProgress.create({
              data: { userId, pathId: elementId, status: 'locked' }
            });
            break;
          case 'step':
            progress = await prisma.userStepProgress.create({
              data: { userId, stepId: elementId, status: 'locked' }
            });
            break;
        }
      }

      // Ajouter les informations de progression et de l'élément à la requête
      req.progression = {
        element,
        progress,
        elementType,
        userId,
        elementId
      };

      next();
    } catch (error) {
      console.error('Erreur dans le middleware checkProgressionAccess:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
      });
    }
  };
};

/**
 * Middleware qui vérifie si un élément est débloqué pour l'utilisateur
 */
const requireUnlockedAccess = (req, res, next) => {
  const { progress } = req.progression;

  if (!progress || progress.status === 'locked') {
    return res.status(403).json({
      success: false,
      error: 'Accès refusé: élément non débloqué',
      status: progress?.status || 'unknown'
    });
  }

  next();
};

/**
 * Middleware qui vérifie si un élément peut être démarré (doit être unlocked)
 */
const requireStartableAccess = (req, res, next) => {
  const { progress } = req.progression;

  if (!progress) {
    return res.status(403).json({
      success: false,
      error: 'Accès refusé: progression non trouvée'
    });
  }

  if (progress.status === 'locked') {
    return res.status(403).json({
      success: false,
      error: 'Accès refusé: élément non débloqué',
      status: progress.status
    });
  }

  if (progress.status === 'completed') {
    return res.status(400).json({
      success: false,
      error: 'Élément déjà complété',
      status: progress.status
    });
  }

  next();
};

/**
 * Middleware qui met à jour automatiquement la progression lors de l'accès
 */
const updateProgressOnAccess = (req, res, next) => {
  // Mettre à jour lastAccessedAt de manière asynchrone sans bloquer
  setImmediate(async () => {
    try {
      const { elementType, userId, elementId } = req.progression;
      
      switch (elementType) {
        case 'level':
          await prisma.userLevelProgress.update({
            where: { userId_levelId: { userId, levelId: elementId } },
            data: { lastAccessedAt: new Date() }
          });
          break;
        case 'module':
          await prisma.userModuleProgress.update({
            where: { userId_moduleId: { userId, moduleId: elementId } },
            data: { lastAccessedAt: new Date() }
          });
          break;
        case 'path':
          await prisma.userPathProgress.update({
            where: { userId_pathId: { userId, pathId: elementId } },
            data: { lastAccessedAt: new Date() }
          });
          break;
        case 'step':
          await prisma.userStepProgress.update({
            where: { userId_stepId: { userId, stepId: elementId } },
            data: { lastAccessedAt: new Date() }
          });
          break;
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de lastAccessedAt:', error);
    }
  });

  next();
};

module.exports = {
  checkProgressionAccess,
  requireUnlockedAccess,
  requireStartableAccess,
  updateProgressOnAccess
};
