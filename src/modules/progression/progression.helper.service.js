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
        language: true
      }
    });

    if (!languageProgress) {
      return null;
    }

    // Récupérer tous les niveaux de cette langue avec leurs progressions
    const levels = await prisma.level.findMany({
      where: { 
        languageId,
        isActive: true 
      },
      orderBy: { index: 'asc' },
      include: {
        // Progression de l'utilisateur pour ce niveau
        userProgress: {
          where: { userId }
        },
        modules: {
          where: { isActive: true },
          orderBy: { index: 'asc' },
          include: {
            // Progression de l'utilisateur pour ce module
            userProgress: {
              where: { userId }
            },
            paths: {
              where: { isActive: true },
              orderBy: { index: 'asc' },
              include: {
                // Progression de l'utilisateur pour ce parcours
                userProgress: {
                  where: { userId }
                },
                steps: {
                  where: { isActive: true },
                  orderBy: { index: 'asc' },
                  include: {
                    // Progression de l'utilisateur pour cette étape
                    userProgress: {
                      where: { userId }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Construire l'objet de progression complet
    const completeProgression = {
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
        userProgress: level.userProgress[0] ? {
          id: level.userProgress[0].id,
          status: level.userProgress[0].status,
          progressPercentage: level.userProgress[0].progressPercentage,
          totalXp: level.userProgress[0].totalXp,
          timeSpentMinutes: level.userProgress[0].timeSpentMinutes,
          unlockedAt: level.userProgress[0].unlockedAt,
          startedAt: level.userProgress[0].startedAt,
          completedAt: level.userProgress[0].completedAt,
          lastAccessedAt: level.userProgress[0].lastAccessedAt
        } : null,
        modules: level.modules.map(module => ({
          id: module.id,
          title: module.title,
          description: module.description,
          iconUrl: module.iconUrl,
          index: module.index,
          userProgress: module.userProgress[0] ? {
            id: module.userProgress[0].id,
            status: module.userProgress[0].status,
            progressPercentage: module.userProgress[0].progressPercentage,
            totalXp: module.userProgress[0].totalXp,
            timeSpentMinutes: module.userProgress[0].timeSpentMinutes,
            unlockedAt: module.userProgress[0].unlockedAt,
            startedAt: module.userProgress[0].startedAt,
            completedAt: module.userProgress[0].completedAt,
            lastAccessedAt: module.userProgress[0].lastAccessedAt
          } : null,
          paths: module.paths.map(path => ({
            id: path.id,
            title: path.title,
            description: path.description,
            thumbnailUrl: path.thumbnailUrl,
            difficulty: path.difficulty,
            estimatedHours: path.estimatedHours,
            index: path.index,
            userProgress: path.userProgress[0] ? {
              id: path.userProgress[0].id,
              status: path.userProgress[0].status,
              currentStepIndex: path.userProgress[0].currentStepIndex,
              progressPercentage: path.userProgress[0].progressPercentage,
              totalXp: path.userProgress[0].totalXp,
              timeSpentMinutes: path.userProgress[0].timeSpentMinutes,
              quizScore: path.userProgress[0].quizScore,
              unlockedAt: path.userProgress[0].unlockedAt,
              startedAt: path.userProgress[0].startedAt,
              completedAt: path.userProgress[0].completedAt,
              lastAccessedAt: path.userProgress[0].lastAccessedAt
            } : null,
            steps: path.steps.map(step => ({
              id: step.id,
              title: step.title,
              description: step.description,
              stepType: step.stepType,
              estimatedMinutes: step.estimatedMinutes,
              index: step.index,
              userProgress: step.userProgress[0] ? {
                id: step.userProgress[0].id,
                status: step.userProgress[0].status,
                progress: step.userProgress[0].progress,
                score: step.userProgress[0].score,
                completedAt: step.userProgress[0].completedAt,
                startedAt: step.userProgress[0].startedAt,
                timeSpentMinutes: step.userProgress[0].timeSpentMinutes,
                totalXp: step.userProgress[0].totalXp
              } : null
            }))
          }))
        }))
      }))
    };

    return completeProgression;
  } catch (error) {
    console.error('Erreur détaillée:', error);
    throw new Error(`Erreur lors de la récupération de la progression: ${error.message}`);
  }
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
   */
  async recalculateProgressPercentages(userId, languageId) {
    try {
      const progression = await this.getCompleteUserProgression(userId, languageId);
      
      if (!progression) {
        return;
      }

      // Recalculer les pourcentages pour chaque niveau
      for (const level of progression.levels) {
        await this.recalculateLevelProgress(userId, level);
      }

      // Mettre à jour la progression globale
      const stats = await this.calculateProgressionStats(userId, languageId);
      await prisma.userLanguageProgress.update({
        where: { userId_languageId: { userId, languageId } },
        data: { overallProgress: stats.overallProgressPercentage }
      });

      return { success: true, message: 'Progression recalculée avec succès' };
    } catch (error) {
      throw new Error(`Erreur lors du recalcul de la progression: ${error.message}`);
    }
  }

  /**
   * Recalcule la progression d'un niveau
   */
  async recalculateLevelProgress(userId, level) {
    const totalModules = level.modules.length;
    const completedModules = level.modules.filter(m => m.userProgress?.status === 'completed').length;
    const levelProgressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

    if (level.userProgress) {
      await prisma.userLevelProgress.update({
        where: { userId_levelId: { userId, levelId: level.id } },
        data: { progressPercentage: levelProgressPercentage }
      });
    }

    // Recalculer les modules
    for (const module of level.modules) {
      await this.recalculateModuleProgress(userId, module);
    }
  }

  /**
   * Recalcule la progression d'un module
   */
  async recalculateModuleProgress(userId, module) {
    const totalPaths = module.paths.length;
    const completedPaths = module.paths.filter(p => p.userProgress?.status === 'completed').length;
    const moduleProgressPercentage = totalPaths > 0 ? (completedPaths / totalPaths) * 100 : 0;

    if (module.userProgress) {
      await prisma.userModuleProgress.update({
        where: { userId_moduleId: { userId, moduleId: module.id } },
        data: { progressPercentage: moduleProgressPercentage }
      });
    }

    // Recalculer les parcours
    for (const path of module.paths) {
      await this.recalculatePathProgress(userId, path);
    }
  }

  /**
   * Recalcule la progression d'un parcours
   */
  async recalculatePathProgress(userId, path) {
    const totalSteps = path.steps.length;
    const completedSteps = path.steps.filter(s => s.userProgress?.status === 'completed').length;
    const pathProgressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    if (path.userProgress) {
      await prisma.userPathProgress.update({
        where: { userId_pathId: { userId, pathId: path.id } },
        data: { progressPercentage: pathProgressPercentage }
      });
    }
  }

  /**
   * Méthodes de validation
   */
  async validateUser(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    return user;
  }

  async validateLanguage(languageId) {
    const language = await prisma.language.findUnique({ where: { id: languageId } });
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
