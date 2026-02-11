const progressionService = require('./progression.service');
const progressionHelper = require('./progression.helper.service');
const {
  initializeProgressionSchema,
  completeStepSchema,
  completePathSchema,
  completeModuleSchema,
  completeLevelSchema,
  getUserProgressionSchema
} = require('./progression.schema');

/**
 * Initialise la progression d'un utilisateur sur une langue
 */
exports.initializeProgression = async (req, res, next) => {
  try {
    const { error, value } = initializeProgressionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const progression = await progressionService.initializeUserLanguageProgress(
      value.userId, 
      value.languageId
    );

    res.status(201).json({
      success: true,
      message: 'Progression initialisée avec succès',
      data: progression
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Complète une étape et débloque la suivante
 */
exports.completeStep = async (req, res, next) => {
  try {
    const { error, value } = completeStepSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const stepProgress = await progressionService.completeStepAndUnlockNext(
      value.userId,
      value.stepId
    );

    res.json({
      success: true,
      message: 'Étape complétée avec succès',
      data: stepProgress
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Complète un parcours et débloque le suivant
 */
exports.completePath = async (req, res, next) => {
  try {
    const { error, value } = completePathSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const pathProgress = await progressionService.completePathAndUnlockNext(
      value.userId,
      value.pathId
    );

    res.json({
      success: true,
      message: 'Parcours complété avec succès',
      data: pathProgress
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Complète un module et débloque le suivant
 */
exports.completeModule = async (req, res, next) => {
  try {
    const { error, value } = completeModuleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const moduleProgress = await progressionService.completeModuleAndUnlockNext(
      value.userId,
      value.moduleId
    );

    res.json({
      success: true,
      message: 'Module complété avec succès',
      data: moduleProgress
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Complète un niveau et débloque le suivant
 */
exports.completeLevel = async (req, res, next) => {
  try {
    const { error, value } = completeLevelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const levelProgress = await progressionService.completeLevelAndUnlockNext(
      value.userId,
      value.levelId
    );

    res.json({
      success: true,
      message: 'Niveau complété avec succès',
      data: levelProgress
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Récupère la progression complète d'un utilisateur
 */
exports.getUserProgression = async (req, res, next) => {
  try {
    const { error, value } = getUserProgressionSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.details[0].message 
      });
    }

    const progression = await progressionService.getUserProgression(
      value.userId,
      value.languageId
    );

    if (!progression) {
      return res.status(404).json({
        success: false,
        error: 'Progression non trouvée pour cet utilisateur et cette langue'
      });
    }

    res.json({
      success: true,
      data: progression
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Débloque manuellement un élément (admin)
 */
exports.unlockElement = async (req, res, next) => {
  try {
    const { userId, elementType, elementId } = req.body;
    
    let result;
    switch (elementType) {
      case 'level':
        result = await progressionService.unlockLevelForUser(userId, elementId);
        break;
      case 'module':
        result = await progressionService.unlockModuleForUser(userId, elementId);
        break;
      case 'path':
        result = await progressionService.unlockPathForUser(userId, elementId);
        break;
      case 'step':
        result = await progressionService.unlockStepForUser(userId, elementId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Type d\'élément non valide. Options: level, module, path, step'
        });
    }

    res.json({
      success: true,
      message: `${elementType} débloqué avec succès`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Récupère la progression complète et structurée d'un utilisateur
 */
exports.getCompleteProgression = async (req, res, next) => {
  try {
    const { userId, languageId } = req.params;
    
    const progression = await progressionHelper.getCompleteUserProgression(userId, languageId);
    
    if (!progression) {
      return res.status(404).json({
        success: false,
        error: 'Progression non trouvée pour cet utilisateur et cette langue'
      });
    }

    res.json({
      success: true,
      data: progression
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Récupère les statistiques de progression d'un utilisateur
 */
exports.getProgressionStats = async (req, res, next) => {
  try {
    const { userId, languageId } = req.params;
    
    const stats = await progressionHelper.calculateProgressionStats(userId, languageId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Récupère les prochains éléments à compléter
 */
exports.getNextElements = async (req, res, next) => {
  try {
    const { userId, languageId } = req.params;
    
    const nextElements = await progressionHelper.getNextElements(userId, languageId);
    
    res.json({
      success: true,
      data: nextElements
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Vérifie si un utilisateur peut accéder à un élément
 */
exports.checkAccess = async (req, res, next) => {
  try {
    const { userId, elementType, elementId } = req.params;
    
    const access = await progressionHelper.canAccessElement(userId, elementType, elementId);
    
    res.json({
      success: true,
      data: access
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Recalcule les pourcentages de progression
 */
exports.recalculateProgress = async (req, res, next) => {
  try {
    const { userId, languageId } = req.params;
    
    await progressionHelper.recalculateProgressPercentages(userId, languageId);
    
    res.json({
      success: true,
      message: 'Progression recalculée avec succès'
    });
  } catch (err) {
    next(err);
  }
};
