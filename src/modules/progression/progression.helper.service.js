const progressionService = require('./progression.service');
const { prisma } = require('../../config/prisma');

/**
 * Service utilitaire pour la gestion de la progression
 * Fournit des fonctions helpers pour les contrôleurs et services
 */
class ProgressionHelperService {
  
  /**
   * Récupère la progression complète d'un utilisateur sur une langue
   * avec tous les niveaux, modules, parcours et étapes structurés
   */
  async getCompleteUserProgression(userId, languageId) {
  try {
    // Validation
    await this.validateUser(userId);
    const language = await this.validateLanguage(languageId);

    // Récupérer la progression de la langue
    const languageProgress = await prisma.userLanguageProgress.findUnique({
      where: { userId_languageId: { userId, languageId } },
      include: {
        language: { select: { id: true, code: true, name: true, description: true, iconUrl: true, flagUrl: true } }
      }
    });

    if (!languageProgress) {
      return null;
    }

    // Récupérer tous les niveaux de cette langue (1 requête)
    const levels = await prisma.level.findMany({
      where: { 
        languageId,
        isActive: true 
      },
      orderBy: { index: 'asc' }
    });

    if (levels.length === 0) {
      return this.buildEmptyProgression(languageProgress, userId);
    }

    // Récupérer toutes les progressions utilisateur en parallèle (4 requêtes)
    const levelIds = levels.map(l => l.id);
    const [levelProgress, modules] = await Promise.all([
      prisma.userLevelProgress.findMany({
        where: { userId, levelId: { in: levelIds } }
      }),
      prisma.module.findMany({
        where: { levelId: { in: levelIds }, isActive: true },
        orderBy: { index: 'asc' }
      })
    ]);

    if (modules.length === 0) {
      return this.buildProgressionWithLevels(languageProgress, userId, levels, levelProgress, [], [], [], []);
    }

    // Récupérer modules progress et paths (2 requêtes)
    const moduleIds = modules.map(m => m.id);
    const [moduleProgress, paths] = await Promise.all([
      prisma.userModuleProgress.findMany({
        where: { userId, moduleId: { in: moduleIds } }
      }),
      prisma.path.findMany({
        where: { moduleId: { in: moduleIds }, isActive: true },
        orderBy: { index: 'asc' }
      })
    ]);

    if (paths.length === 0) {
      return this.buildProgressionWithLevels(languageProgress, userId, levels, levelProgress, modules, moduleProgress, [], []);
    }

    // Récupérer paths progress et steps (2 requêtes)
    const pathIds = paths.map(p => p.id);
    const [pathProgress, steps] = await Promise.all([
      prisma.userPathProgress.findMany({
        where: { userId, pathId: { in: pathIds } }
      }),
      prisma.step.findMany({
        where: { pathId: { in: pathIds }, isActive: true },
        orderBy: { index: 'asc' }
      })
    ]);

    // Récupérer step progress (1 requête)
    const stepIds = steps.map(s => s.id);
    const stepProgress = stepIds.length > 0 ? await prisma.userStepProgress.findMany({
      where: { userId, stepId: { in: stepIds } }
    }) : [];

    return this.buildProgressionWithLevels(
      languageProgress, userId, levels, levelProgress, 
      modules, moduleProgress, paths, pathProgress, 
      steps, stepProgress
    );

  }
  catch (error) {
    console.error('Erreur détaillée:', error);
    throw new Error(`Erreur lors de la récupération de la progression: ${error.message}`);
  }
}

  /**
   * Construit la progression avec tous les éléments
   */
  buildProgressionWithLevels(languageProgress, userId, levels, levelProgress, modules = [], moduleProgress = [], paths = [], pathProgress = [], steps = [], stepProgress = []) {
    // Créer des maps pour un accès rapide
    const levelProgressMap = new Map(levelProgress.map(p => [p.levelId, p]));
    const moduleProgressMap = new Map(moduleProgress.map(p => [p.moduleId, p]));
    const pathProgressMap = new Map(pathProgress.map(p => [p.pathId, p]));
    const stepProgressMap = new Map(stepProgress.map(p => [p.stepId, p]));

    // Créer des maps hiérarchiques
    const stepsMap = new Map();
    steps.forEach(step => {
      if (!stepsMap.has(step.pathId)) stepsMap.set(step.pathId, []);
      stepsMap.get(step.pathId).push({
        ...step,
        userProgress: stepProgressMap.get(step.id) || null
      });
    });

    const pathsMap = new Map();
    paths.forEach(path => {
      if (!pathsMap.has(path.moduleId)) pathsMap.set(path.moduleId, []);
      pathsMap.get(path.moduleId).push({
        ...path,
        userProgress: pathProgressMap.get(path.id) || null,
        steps: stepsMap.get(path.id) || []
      });
    });

    const modulesMap = new Map();
    modules.forEach(module => {
      if (!modulesMap.has(module.levelId)) modulesMap.set(module.levelId, []);
      modulesMap.get(module.levelId).push({
        ...module,
        userProgress: moduleProgressMap.get(module.id) || null,
        paths: pathsMap.get(module.id) || []
      });
    });

    // Construire l'objet de progression complet
    return {
      user: userId,
      language: {
        id: languageProgress.language.id,
        code: languageProgress.language.code,
        name: languageProgress.language.name,
        description: languageProgress.language.description,
        iconUrl: languageProgress.language.iconUrl,
        flagUrl: languageProgress.language.flagUrl
      },
      overallProgress: {
        id: languageProgress.id,
        status: languageProgress.status,
        overallProgress: languageProgress.overallProgress,
        totalXp: languageProgress.totalXp,
        totalTimeMinutes: languageProgress.totalTimeMinutes,
        startedAt: languageProgress.startedAt,
        completedAt: languageProgress.completedAt,
        lastAccessedAt: languageProgress.lastAccessedAt
      },
      levels: levels.map(level => ({
        id: level.id,
        code: level.code,
        name: level.name,
        description: level.description,
        index: level.index,
        userProgress: levelProgressMap.get(level.id) || null,
        modules: modulesMap.get(level.id) || []
      }))
    };
  }

  /**
   * Construit une progression vide
   */
  buildEmptyProgression(languageProgress, userId) {
    return {
      user: userId,
      language: {
        id: languageProgress.language.id,
        code: languageProgress.language.code,
        name: languageProgress.language.name,
        description: languageProgress.language.description,
        iconUrl: languageProgress.language.iconUrl,
        flagUrl: languageProgress.language.flagUrl
      },
      overallProgress: {
        id: languageProgress.id,
        status: languageProgress.status,
        overallProgress: languageProgress.overallProgress,
        totalXp: languageProgress.totalXp,
        totalTimeMinutes: languageProgress.totalTimeMinutes,
        startedAt: languageProgress.startedAt,
        completedAt: languageProgress.completedAt,
        lastAccessedAt: languageProgress.lastAccessedAt
      },
      levels: []
    };
  }

  /**
   * Calcule les statistiques de progression d'un utilisateur
   */
  async calculateProgressionStats(userId, languageId) {
    try {
      const progression = await this.getCompleteUserProgression(userId, languageId);
      
      if (!progression) {
        return this.getDefaultStats();
      }

      const stats = {
        totalLevels: progression.levels.length,
        completedLevels: this.countCompletedItems(progression.levels, 'userProgress'),
        totalModules: this.countTotalModules(progression.levels),
        completedModules: this.countCompletedModules(progression.levels),
        totalPaths: this.countTotalPaths(progression.levels),
        completedPaths: this.countCompletedPaths(progression.levels),
        totalSteps: this.countTotalSteps(progression.levels),
        completedSteps: this.countCompletedSteps(progression.levels)
      };

      stats.overallProgressPercentage = stats.totalSteps > 0 
        ? Math.round((stats.completedSteps / stats.totalSteps) * 100 * 100) / 100 
        : 0;

      // Calculer le temps total estimé
      stats.totalEstimatedHours = this.calculateTotalEstimatedHours(progression.levels);
      stats.completedEstimatedHours = this.calculateCompletedEstimatedHours(progression.levels);

      return stats;
    } catch (error) {
      throw new Error(`Erreur lors du calcul des statistiques: ${error.message}`);
    }
  }

  /**
   * Statistiques par défaut
   */
  getDefaultStats() {
    return {
      totalLevels: 0,
      completedLevels: 0,
      totalModules: 0,
      completedModules: 0,
      totalPaths: 0,
      completedPaths: 0,
      totalSteps: 0,
      completedSteps: 0,
      overallProgressPercentage: 0,
      totalEstimatedHours: 0,
      completedEstimatedHours: 0
    };
  }

  /**
   * Compteurs utilitaires
   */
  countTotalModules(levels) {
    return levels.reduce((sum, level) => sum + level.modules.length, 0);
  }

  countCompletedModules(levels) {
    return levels.reduce((sum, level) => 
      sum + level.modules.filter(m => m.userProgress?.status === 'completed').length, 0);
  }

  countTotalPaths(levels) {
    return levels.reduce((sum, level) => 
      sum + level.modules.reduce((sum2, module) => sum2 + module.paths.length, 0), 0);
  }

  countCompletedPaths(levels) {
    return levels.reduce((sum, level) => 
      sum + level.modules.reduce((sum2, module) => 
        sum2 + module.paths.filter(p => p.userProgress?.status === 'completed').length, 0), 0);
  }

  countTotalSteps(levels) {
    return levels.reduce((sum, level) => 
      sum + level.modules.reduce((sum2, module) => 
        sum2 + module.paths.reduce((sum3, path) => sum3 + path.steps.length, 0), 0), 0);
  }

  countCompletedSteps(levels) {
    return levels.reduce((sum, level) => 
      sum + level.modules.reduce((sum2, module) => 
        sum2 + module.paths.reduce((sum3, path) => 
          sum3 + path.steps.filter(s => s.userProgress?.status === 'completed').length, 0), 0), 0);
  }

  countCompletedItems(items, progressProperty) {
    return items.filter(item => item[progressProperty]?.status === 'completed').length;
  }

  /**
   * Calcule le temps estimé total
   */
  calculateTotalEstimatedHours(levels) {
    return levels.reduce((sum, level) => 
      sum + level.modules.reduce((sum2, module) => 
        sum2 + module.paths.reduce((sum3, path) => (sum3 + (path.estimatedHours || 0)), 0), 0), 0);
  }

  /**
   * Calcule le temps estimé complété
   */
  calculateCompletedEstimatedHours(levels) {
    return levels.reduce((sum, level) => 
      sum + level.modules.reduce((sum2, module) => 
        sum2 + module.paths.reduce((sum3, path) => 
          path.userProgress?.status === 'completed' ? (sum3 + (path.estimatedHours || 0)) : sum3, 0), 0), 0);
  }

  /**
   * Récupère les prochains éléments à compléter
   */
  async getNextElements(userId, languageId) {
    try {
      const progression = await this.getCompleteUserProgression(userId, languageId);
      
      if (!progression) {
        return [];
      }

      return this.findNextElementsInHierarchy(progression.levels);
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des prochains éléments: ${error.message}`);
    }
  }

  /**
   * Trouve les prochains éléments dans la hiérarchie
   */
  findNextElementsInHierarchy(levels) {
    const nextElements = [];

    for (const level of levels) {
      if (level.userProgress?.status !== 'completed') {
        const nextInLevel = this.findNextInLevel(level);
        if (nextInLevel) {
          nextElements.push(nextInLevel);
          return nextElements;
        }
      }
    }

    return nextElements; // Tout est complété
  }

  /**
   * Trouve le prochain élément dans un niveau
   */
  findNextInLevel(level) {
    for (const module of level.modules) {
      if (module.userProgress?.status !== 'completed') {
        const nextInModule = this.findNextInModule(module, level);
        if (nextInModule) return nextInModule;
      }
    }
    
    // Si tous les modules sont complétés mais pas le niveau
    if (level.userProgress?.status !== 'completed') {
      return {
        type: 'level',
        element: {
          id: level.id,
          name: level.name,
          description: level.description,
          index: level.index
        },
        userProgress: level.userProgress
      };
    }

    return null;
  }

  /**
   * Trouve le prochain élément dans un module
   */
  findNextInModule(module, level) {
    for (const path of module.paths) {
      if (path.userProgress?.status !== 'completed') {
        const nextInPath = this.findNextInPath(path, module, level);
        if (nextInPath) return nextInPath;
      }
    }
    
    // Si tous les parcours sont complétés mais pas le module
    if (module.userProgress?.status !== 'completed') {
      return {
        type: 'module',
        element: {
          id: module.id,
          title: module.title,
          description: module.description,
          index: module.index
        },
        parent: {
          type: 'level',
          element: {
            id: level.id,
            name: level.name
          }
        },
        userProgress: module.userProgress
      };
    }

    return null;
  }

  /**
   * Trouve le prochain élément dans un parcours
   */
  findNextInPath(path, module, level) {
    for (const step of path.steps) {
      if (step.userProgress?.status !== 'completed') {
        return {
          type: 'step',
          element: {
            id: step.id,
            title: step.title,
            description: step.description,
            stepType: step.stepType,
            estimatedMinutes: step.estimatedMinutes,
            index: step.index
          },
          parent: {
            type: 'path',
            element: {
              id: path.id,
              title: path.title
            }
          },
          hierarchy: {
            level: {
              id: level.id,
              name: level.name
            },
            module: {
              id: module.id,
              title: module.title
            }
          },
          userProgress: step.userProgress
        };
      }
    }
    
    // Si toutes les étapes sont complétées mais pas le parcours
    if (path.userProgress?.status !== 'completed') {
      return {
        type: 'path',
        element: {
          id: path.id,
          title: path.title,
          description: path.description,
          estimatedHours: path.estimatedHours
        },
        parent: {
          type: 'module',
          element: {
            id: module.id,
            title: module.title
          }
        },
        hierarchy: {
          level: {
            id: level.id,
            name: level.name
          }
        },
        userProgress: path.userProgress
      };
    }

    return null;
  }

  /**
   * Vérifie si un utilisateur peut accéder à un élément
   */
  async canAccessElement(userId, elementType, elementId) {
    try {
      // Validation
      await this.validateUser(userId);
      const element = await this.validateElement(elementType, elementId);

      // Récupérer la progression
      const progress = await this.getOrCreateProgression(userId, elementType, elementId);

      if (progress.status === 'locked') {
        return { canAccess: false, reason: 'Element is locked', status: progress.status };
      }

      return { canAccess: true, progress };
    } catch (error) {
      return { canAccess: false, reason: error.message };
    }
  }

  /**
   * Recalcule et met à jour les pourcentages de progression
   * Toutes les mises à jour s'exécutent en parallèle — aucune boucle await
   */
  async recalculateProgressPercentages(userId, languageId) {
    try {
      const progression = await this.getCompleteUserProgression(userId, languageId);
      if (!progression) return;

      // Collecter tous les updates nécessaires en mémoire (zéro await dans les boucles)
      const levelUpdates  = [];
      const moduleUpdates = [];
      const pathUpdates   = [];

      for (const level of progression.levels) {
        if (level.userProgress) {
          const completed = level.modules.filter(m => m.userProgress?.status === 'completed').length;
          const pct = level.modules.length > 0 ? (completed / level.modules.length) * 100 : 0;
          levelUpdates.push(prisma.userLevelProgress.update({
            where: { userId_levelId: { userId, levelId: level.id } },
            data: { progressPercentage: pct }
          }));
        }

        for (const module of level.modules) {
          if (module.userProgress) {
            const completed = module.paths.filter(p => p.userProgress?.status === 'completed').length;
            const pct = module.paths.length > 0 ? (completed / module.paths.length) * 100 : 0;
            moduleUpdates.push(prisma.userModuleProgress.update({
              where: { userId_moduleId: { userId, moduleId: module.id } },
              data: { progressPercentage: pct }
            }));
          }

          for (const path of module.paths) {
            if (path.userProgress) {
              const completed = path.steps.filter(s => s.userProgress?.status === 'completed').length;
              const pct = path.steps.length > 0 ? (completed / path.steps.length) * 100 : 0;
              pathUpdates.push(prisma.userPathProgress.update({
                where: { userId_pathId: { userId, pathId: path.id } },
                data: { progressPercentage: pct }
              }));
            }
          }
        }
      }

      // Calculer overallProgress directement depuis progression (évite 2ème appel DB)
      const totalSteps = progression.levels.reduce((sum, lv) =>
        sum + lv.modules.reduce((s2, m) =>
          s2 + m.paths.reduce((s3, p) => s3 + p.steps.length, 0), 0), 0);
      const completedSteps = progression.levels.reduce((sum, lv) =>
        sum + lv.modules.reduce((s2, m) =>
          s2 + m.paths.reduce((s3, p) =>
            s3 + p.steps.filter(s => s.userProgress?.status === 'completed').length, 0), 0), 0);
      const overallProgress = totalSteps > 0
        ? Math.round((completedSteps / totalSteps) * 100 * 100) / 100
        : 0;

      // Tout envoyer en parallèle en 1 seul round
      await Promise.all([
        ...levelUpdates,
        ...moduleUpdates,
        ...pathUpdates,
        prisma.userLanguageProgress.update({
          where: { userId_languageId: { userId, languageId } },
          data: { overallProgress }
        }),
      ]);

      return { success: true, message: 'Progression recalculée avec succès' };
    } catch (error) {
      throw new Error(`Erreur lors du recalcul de la progression: ${error.message}`);
    }
  }

  /**
   * Méthodes de validation
   */
  async validateUser(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    return user;
  }

  async validateLanguage(languageId) {
    const language = await prisma.language.findUnique({ where: { id: languageId }, select: { id: true } });
    if (!language) {
      throw new Error('Langue non trouvée');
    }
    return language;
  }

  async validateElement(elementType, elementId) {
    let element;
    
    switch (elementType) {
      case 'level':
        element = await prisma.level.findUnique({ where: { id: elementId } });
        break;
      case 'module':
        element = await prisma.module.findUnique({ where: { id: elementId } });
        break;
      case 'path':
        element = await prisma.path.findUnique({ where: { id: elementId } });
        break;
      case 'step':
        element = await prisma.step.findUnique({ where: { id: elementId } });
        break;
      default:
        throw new Error('Type d\'élément non valide');
    }

    if (!element) {
      throw new Error('Élément non trouvé');
    }

    return element;
  }

  /**
   * Récupère ou crée une progression
   */
  async getOrCreateProgression(userId, elementType, elementId) {
    let progress;

    switch (elementType) {
      case 'level':
        progress = await prisma.userLevelProgress.findUnique({
          where: { userId_levelId: { userId, levelId: elementId } }
        });
        if (!progress) {
          progress = await prisma.userLevelProgress.create({
            data: { userId, levelId: elementId, status: 'locked' }
          });
        }
        break;
      case 'module':
        progress = await prisma.userModuleProgress.findUnique({
          where: { userId_moduleId: { userId, moduleId: elementId } }
        });
        if (!progress) {
          progress = await prisma.userModuleProgress.create({
            data: { userId, moduleId: elementId, status: 'locked' }
          });
        }
        break;
      case 'path':
        progress = await prisma.userPathProgress.findUnique({
          where: { userId_pathId: { userId, pathId: elementId } }
        });
        if (!progress) {
          progress = await prisma.userPathProgress.create({
            data: { userId, pathId: elementId, status: 'locked' }
          });
        }
        break;
      case 'step':
        progress = await prisma.userStepProgress.findUnique({
          where: { userId_stepId: { userId, stepId: elementId } }
        });
        if (!progress) {
          progress = await prisma.userStepProgress.create({
            data: { userId, stepId: elementId, status: 'locked' }
          });
        }
        break;
    }

    return progress;
  }
}

module.exports = new ProgressionHelperService();
