const { prisma } = require('../../config/prisma');

// Recalcule progressPercentage du parcours, module, level et overallProgress de la langue
// Formule exacte : étapes complétées / total étapes à chaque niveau de la hiérarchie
async function recalculateAllProgress(userId, pathId) {
  try {
    const path = await prisma.path.findUnique({
      where: { id: pathId },
      include: { module: { include: { level: true } } }
    });
    if (!path) return;

    const moduleId = path.moduleId;
    const levelId = path.module.levelId;
    const languageId = path.module.level.languageId;

    // 1. % du parcours = étapes complétées / total étapes du parcours
    const stepsInPath = await prisma.step.findMany({
      where: { pathId, isActive: true },
      select: { id: true }
    });
    const stepIdsInPath = stepsInPath.map(s => s.id);
    const completedInPath = stepIdsInPath.length > 0
      ? await prisma.userStepProgress.count({
          where: { userId, stepId: { in: stepIdsInPath }, status: 'completed' }
        })
      : 0;
    const pathPct = stepIdsInPath.length > 0
      ? Math.round((completedInPath / stepIdsInPath.length) * 100)
      : 0;
    await prisma.userPathProgress.updateMany({
      where: { userId, pathId },
      data: { progressPercentage: pathPct }
    });

    // 2. % du module = étapes complétées / total étapes du module
    const pathsInModule = await prisma.path.findMany({
      where: { moduleId, isActive: true },
      select: { id: true }
    });
    const pathIdsInModule = pathsInModule.map(p => p.id);
    const stepsInModule = pathIdsInModule.length > 0
      ? await prisma.step.findMany({
          where: { pathId: { in: pathIdsInModule }, isActive: true },
          select: { id: true }
        })
      : [];
    const stepIdsInModule = stepsInModule.map(s => s.id);
    const completedInModule = stepIdsInModule.length > 0
      ? await prisma.userStepProgress.count({
          where: { userId, stepId: { in: stepIdsInModule }, status: 'completed' }
        })
      : 0;
    const modulePct = stepIdsInModule.length > 0
      ? Math.round((completedInModule / stepIdsInModule.length) * 100)
      : 0;
    await prisma.userModuleProgress.updateMany({
      where: { userId, moduleId },
      data: { progressPercentage: modulePct }
    });

    // 3. % du level = étapes complétées / total étapes du level
    const modulesInLevel = await prisma.module.findMany({
      where: { levelId, isActive: true },
      select: { id: true }
    });
    const moduleIdsInLevel = modulesInLevel.map(m => m.id);
    const pathsInLevel = moduleIdsInLevel.length > 0
      ? await prisma.path.findMany({
          where: { moduleId: { in: moduleIdsInLevel }, isActive: true },
          select: { id: true }
        })
      : [];
    const pathIdsInLevel = pathsInLevel.map(p => p.id);
    const stepsInLevel = pathIdsInLevel.length > 0
      ? await prisma.step.findMany({
          where: { pathId: { in: pathIdsInLevel }, isActive: true },
          select: { id: true }
        })
      : [];
    const stepIdsInLevel = stepsInLevel.map(s => s.id);
    const completedInLevel = stepIdsInLevel.length > 0
      ? await prisma.userStepProgress.count({
          where: { userId, stepId: { in: stepIdsInLevel }, status: 'completed' }
        })
      : 0;
    const levelPct = stepIdsInLevel.length > 0
      ? Math.round((completedInLevel / stepIdsInLevel.length) * 100)
      : 0;
    await prisma.userLevelProgress.updateMany({
      where: { userId, levelId },
      data: { progressPercentage: levelPct }
    });

    // 4. % global langue = étapes complétées / total étapes de toute la langue
    const levelsInLang = await prisma.level.findMany({
      where: { languageId, isActive: true },
      select: { id: true }
    });
    const levelIdsInLang = levelsInLang.map(l => l.id);
    const modulesInLang = levelIdsInLang.length > 0
      ? await prisma.module.findMany({
          where: { levelId: { in: levelIdsInLang }, isActive: true },
          select: { id: true }
        })
      : [];
    const moduleIdsInLang = modulesInLang.map(m => m.id);
    const pathsInLang = moduleIdsInLang.length > 0
      ? await prisma.path.findMany({
          where: { moduleId: { in: moduleIdsInLang }, isActive: true },
          select: { id: true }
        })
      : [];
    const pathIdsInLang = pathsInLang.map(p => p.id);
    const stepsInLang = pathIdsInLang.length > 0
      ? await prisma.step.findMany({
          where: { pathId: { in: pathIdsInLang }, isActive: true },
          select: { id: true }
        })
      : [];
    const stepIdsInLang = stepsInLang.map(s => s.id);
    const completedInLang = stepIdsInLang.length > 0
      ? await prisma.userStepProgress.count({
          where: { userId, stepId: { in: stepIdsInLang }, status: 'completed' }
        })
      : 0;
    const overallPct = stepIdsInLang.length > 0
      ? Math.round((completedInLang / stepIdsInLang.length) * 100)
      : 0;
    await prisma.userLanguageProgress.updateMany({
      where: { userId, languageId },
      data: { overallProgress: overallPct }
    });

  } catch (err) {
    console.error('Erreur recalcul progression:', err.message);
  }
}

/**
 * Service de déblocage automatique des niveaux, modules, parcours et étapes
 * Logique séquentielle stricte : Chaque élément doit être terminé pour débloquer le suivant
 */
class ProgressionUnlockService {

  constructor() {
    this.prisma = prisma;
  }
  
  /**
   * États de progression valides
   */
  static STATUS = {
    LOCKED: 'locked',
    UNLOCKED: 'unlocked', 
    STARTED: 'started',
    COMPLETED: 'completed',
    NOT_STARTED: 'not_started'
  };

  /**
   * Types d'éléments
   */
  static ELEMENT_TYPES = {
  LANGUAGE: 'language',
  LEVEL: 'level',
  MODULE: 'module',
  PATH: 'path',
  STEP: 'step',
  LESSON: 'lesson',      
  EXERCISE: 'exercise',
  QUIZ: 'quiz',
  PATH_QUIZ: 'path_quiz' 
};

  /**
   * Initialise la progression pour un utilisateur sur une langue
   * Débloque automatiquement le premier niveau, premier module, premier parcours, première étape
   */
  async initializeUserLanguageProgress(userId, languageId) {
    try {
      // Valider l'utilisateur et la langue
      await this.validateUser(userId);
      const language = await this.validateLanguage(languageId);

      // Créer ou récupérer la progression de la langue
      let languageProgress = await this.getOrCreateLanguageProgress(userId, languageId);

      // Débloquer le premier niveau de cette langue
      const firstLevel = await this.getFirstLevel(languageId);
      if (firstLevel) {
        await this.unlockLevelWithChildren(userId, firstLevel.id);
        languageProgress = await this.updateLanguageStatus(userId, languageId, ProgressionUnlockService.STATUS.STARTED);
      }

      return {
        success: true,
        message: 'Progression initialisée avec succès',
        data: languageProgress
      };
    } catch (error) {
      throw new Error(`Erreur lors de l'initialisation: ${error.message}`);
    }
  }

  /**
   * Débloque un niveau et tous ses premiers enfants (module → parcours → étape)
   */
  async unlockLevelWithChildren(userId, levelId) {
    // Débloquer le niveau
    await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.LEVEL, levelId);

    // Récupérer et débloquer le premier module
    const firstModule = await this.getFirstModule(levelId);
    if (firstModule) {
      await this.unlockModuleWithChildren(userId, firstModule.id);
    }

    return await this.getUserProgress(userId, ProgressionUnlockService.ELEMENT_TYPES.LEVEL, levelId);
  }

  /**
   * Débloque un module et ses premiers enfants (parcours → étape)
   */
  async unlockModuleWithChildren(userId, moduleId) {
    // Débloquer le module
    await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.MODULE, moduleId);

    // Récupérer et débloquer le premier parcours
    const firstPath = await this.getFirstPath(moduleId);
    if (firstPath) {
      await this.unlockPathWithChildren(userId, firstPath.id);
    }

    return await this.getUserProgress(userId, ProgressionUnlockService.ELEMENT_TYPES.MODULE, moduleId);
  }

  /**
   * Débloque un parcours et sa première étape avec son contenu
   */
  async unlockPathWithChildren(userId, pathId) {
    // Débloquer le parcours
    await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.PATH, pathId);

    // Récupérer et débloquer la première étape
    const firstStep = await this.getFirstStep(pathId);
    if (firstStep) {
      await this.unlockStepWithContent(userId, firstStep.id);
    }

    return await this.getUserProgress(userId, ProgressionUnlockService.ELEMENT_TYPES.PATH, pathId);
  }

  /**
 * Débloque une étape et son contenu (lessons, exercises, quiz)
 */
async unlockStepWithContent(userId, stepId) {
  // Débloquer l'étape
  await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.STEP, stepId);

  // Récupérer les différents types de contenu de cette étape
  const [lesson, exercises, quiz] = await Promise.all([
    this.prisma.lesson.findFirst({ 
      where: { stepId }, 
      orderBy: { index: 'asc' } 
    }),
    this.prisma.exercise.findMany({ 
      where: { stepId}, 
      orderBy: { index: 'asc' } 
    }),
    this.prisma.quiz.findFirst({ 
      where: { stepId }, 
      orderBy: { index: 'asc' } 
    })
  ]);

  // Débloquer le premier élément de chaque type trouvé (avec gestion d'erreurs)
  if (lesson) {
    console.log(`Leçon trouvée pour l'étape ${stepId}: ${lesson.title}`);
  }
  
  // Débloquer le premier exercice
  if (exercises.length > 0) {
    try {
      await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.EXERCISE, exercises[0].id);
    } catch (err) {
      console.warn(`Impossible de débloquer l'exercice ${exercises[0].id}: ${err.message}`);
    }
  }
  
  // Débloquer le premier quiz
  if (quiz) {
    try {
      await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.QUIZ, quiz.id);
    } catch (err) {
      console.warn(`Impossible de débloquer le quiz ${quiz.id}: ${err.message}`);
    }
  }

  return await this.getUserProgress(userId, ProgressionUnlockService.ELEMENT_TYPES.STEP, stepId);
}

  /**
 * Complète une leçon (lesson) et débloque l'exercise suivant
 */
async completeCourseAndUnlockNext(userId, lessonId) {
  try {
    await this.validateUser(userId);
    const lesson = await this.prisma.lesson.findUnique({ 
      where: { id: lessonId },
      include: { step: true }
    });
    if (!lesson) throw new Error('Leçon non trouvée');

    // Marquer la leçon comme complétée (si vous avez un modèle pour ça)
    // Sinon, passez directement aux exercices
    await this.unlockNextContentType(userId, lesson.stepId, 'exercise');

    return { success: true, message: 'Leçon complétée avec succès' };
  } catch (error) {
    throw new Error(`Erreur lors de la complétion de la leçon: ${error.message}`);
  }
}

  /**
   * Complète un exercise et débloque le suivant ou le quiz
   */
  async completeExerciseAndUnlockNext(userId, exerciseId) {
    try {
      await this.validateUser(userId);
      const exercise = await this.prisma.exercise.findUnique({ where: { id: exerciseId } });
      if (!exercise) throw new Error('Exercise non trouvé');

      // Marquer l'exercise comme complété
      await this.completeElement(userId, ProgressionUnlockService.ELEMENT_TYPES.EXERCISE, exerciseId);

      // Récupérer l'exercise suivant
      const nextExercise = await this.prisma.exercise.findFirst({
        where: { stepId: exercise.stepId, order: { gt: exercise.order }, isActive: true },
        orderBy: { order: 'asc' }
      });

      if (nextExercise) {
        await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.EXERCISE, nextExercise.id);
      } else {
        // Tous les exercises complétés, débloquer les quiz
        await this.unlockNextContentType(userId, exercise.stepId, 'quiz');
      }

      return { success: true, message: 'Exercise complété avec succès' };
    } catch (error) {
      throw new Error(`Erreur lors de la complétion de l'exercise: ${error.message}`);
    }
  }

  /**
 * Complète un quiz et débloque l'étape suivante
 */
async completeQuizAndUnlockNext(userId, quizId, score = null) {
  try {
    await this.validateUser(userId);
    const quiz = await this.prisma.quiz.findUnique({ 
      where: { id: quizId },
      include: { step: true }
    });
    if (!quiz) throw new Error('Quiz non trouvé');

    // Marquer le quiz comme complété
    await this.completeElement(userId, ProgressionUnlockService.ELEMENT_TYPES.QUIZ, quizId, {
      score: score
    });

    // Tous les contenus de l'étape sont complétés, passer à l'étape suivante
    await this.completeStepAndUnlockNext(userId, quiz.stepId);

    return { success: true, message: 'Quiz complété avec succès', score };
  } catch (error) {
    throw new Error(`Erreur lors de la complétion du quiz: ${error.message}`);
  }
}

  /**
   * Débloque le prochain type de contenu dans une étape
   */
  async unlockNextContentType(userId, stepId, contentType) {
    if (contentType === 'exercise') {
      const firstExercise = await this.prisma.exercise.findFirst({
        where: { stepId, isActive: true },
        orderBy: { order: 'asc' }
      });
      if (firstExercise) {
        await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.EXERCISE, firstExercise.id);
      }
    } else if (contentType === 'quiz') {
      const firstQuiz = await this.prisma.stepQuiz.findFirst({
        where: { stepId, isActive: true },
        orderBy: { order: 'asc' }
      });
      if (firstQuiz) {
        await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.QUIZ, firstQuiz.id);
      }
    }
  }

  /**
   * Complète une étape et gère le déblocage automatique
   */
  async completeStepAndUnlockNext(userId, stepId) {
    try {
      // Valider
      await this.validateUser(userId);
      const step = await this.validateStep(stepId);

      // Marquer l'étape comme complétée
      const stepProgress = await this.completeElement(
        userId,
        ProgressionUnlockService.ELEMENT_TYPES.STEP,
        stepId
      );

      // Recalculer les pourcentages après chaque étape complétée
      await recalculateAllProgress(userId, step.pathId);

      // Récupérer l'étape suivante dans le même parcours
      const nextStep = await this.getNextStep(step.pathId, step.index);

      if (nextStep) {
        // Débloquer l'étape suivante avec son contenu
        await this.unlockStepWithContent(userId, nextStep.id);
      } else {
        // C'était la dernière étape du parcours
        await this.handlePathCompletion(userId, step.pathId);
      }

      return stepProgress;
    } catch (error) {
      throw new Error(`Erreur lors de la complétion de l'étape: ${error.message}`);
    }
  }

  /**
   * Gère la complétion d'un parcours
   */
  async handlePathCompletion(userId, pathId) {
    // Marquer le parcours comme complété
    await this.completeElement(userId, ProgressionUnlockService.ELEMENT_TYPES.PATH, pathId);

    // Recalculer tous les pourcentages en cascade
    await recalculateAllProgress(userId, pathId);

    // Récupérer le parcours suivant dans le même module
    const path = await this.prisma.path.findUnique({ where: { id: pathId } });
    const nextPath = await this.getNextPath(path.moduleId, path.index);

    if (nextPath) {
      // Débloquer le parcours suivant
      await this.unlockPathWithChildren(userId, nextPath.id);
    } else {
      // C'était le dernier parcours du module
      await this.handleModuleCompletion(userId, path.moduleId);
    }
  }

  /**
   * Gère la complétion d'un module
   */
  async handleModuleCompletion(userId, moduleId) {
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) throw new Error(`Module avec l'ID ${moduleId} introuvable`);

    // Marquer le module comme complété à 100%
    await this.prisma.userModuleProgress.updateMany({
      where: { userId, moduleId },
      data: { status: ProgressionUnlockService.STATUS.COMPLETED, progressPercentage: 100, completedAt: new Date() }
    });

    // Recalculer le level et la langue
    await this.recalculateLevelAndLanguage(userId, module.levelId);

    const nextModule = await this.getNextModule(module.levelId, module.index);
    if (nextModule) {
      await this.unlockModuleWithChildren(userId, nextModule.id);
    } else {
      await this.handleLevelCompletion(userId, module.levelId);
    }
  }

  /**
   * Gère la complétion d'un niveau
   */
  async handleLevelCompletion(userId, levelId) {
    const level = await this.prisma.level.findUnique({ where: { id: levelId } });

    // Marquer le level comme complété à 100%
    await this.prisma.userLevelProgress.updateMany({
      where: { userId, levelId },
      data: { status: ProgressionUnlockService.STATUS.COMPLETED, progressPercentage: 100, completedAt: new Date() }
    });

    // Recalculer la progression globale de la langue
    await this.recalculateLanguageProgress(userId, level.languageId);

    const nextLevel = await this.getNextLevel(level.languageId, level.index);
    if (nextLevel) {
      await this.unlockLevelWithChildren(userId, nextLevel.id);
    } else {
      await this.handleLanguageCompletion(userId, level.languageId);
    }
  }

  /**
   * Gère la complétion d'une langue
   */
  async handleLanguageCompletion(userId, languageId) {
    await this.prisma.userLanguageProgress.updateMany({
      where: { userId, languageId },
      data: { status: ProgressionUnlockService.STATUS.COMPLETED, overallProgress: 100, completedAt: new Date() }
    });
  }

  /**
   * Débloque un élément spécifique
   */
  async unlockElement(userId, elementType, elementId) {
    const progress = await this.getOrCreateProgression(userId, elementType, elementId);
    
    if (progress.status === ProgressionUnlockService.STATUS.LOCKED) {
      return await this.updateProgressStatus(userId, elementType, elementId, ProgressionUnlockService.STATUS.UNLOCKED);
    }
    
    return progress;
  }

  /**
   * Marque un élément comme complété
   */
  async completeElement(userId, elementType, elementId) {
    return await this.updateProgressStatus(userId, elementType, elementId, ProgressionUnlockService.STATUS.COMPLETED, {
      progressPercentage: 100,
      completedAt: new Date()
    });
  }

  /**
   * Méthodes utilitaires de récupération
   */
  async getFirstLevel(languageId) {
    return await this.prisma.level.findFirst({
      where: { languageId, isActive: true },
      orderBy: { index: 'asc' }
    });
  }

  async getFirstModule(levelId) {
    return await this.prisma.module.findFirst({
      where: { levelId, isActive: true },
      orderBy: { index: 'asc' }
    });
  }

  async getFirstPath(moduleId) {
    return await this.prisma.path.findFirst({
      where: { moduleId, isActive: true },
      orderBy: { index: 'asc' }
    });
  }

  async getFirstStep(pathId) {
    return await this.prisma.step.findFirst({
      where: { pathId, isActive: true },
      orderBy: { index: 'asc' }
    });
  }

  async getNextStep(pathId, currentIndex) {
    return await this.prisma.step.findFirst({
      where: { 
        pathId, 
        index: { gt: currentIndex },
        isActive: true 
      },
      orderBy: { index: 'asc' }
    });
  }

  async getNextPath(moduleId, currentIndex) {
    return await this.prisma.path.findFirst({
      where: { 
        moduleId, 
        index: { gt: currentIndex },
        isActive: true 
      },
      orderBy: { index: 'asc' }
    });
  }

  async getNextModule(levelId, currentIndex) {
    return await this.prisma.module.findFirst({
      where: { 
        levelId, 
        index: { gt: currentIndex },
        isActive: true 
      },
      orderBy: { index: 'asc' }
    });
  }

  async getNextLevel(languageId, currentIndex) {
    return await this.prisma.level.findFirst({
      where: { 
        languageId, 
        index: { gt: currentIndex },
        isActive: true 
      },
      orderBy: { index: 'asc' }
    });
  }

  /**
   * Méthodes de validation
   */
  async validateUser(userId) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }
    return user;
  }

  async validateLanguage(languageId) {
    const language = await this.prisma.language.findUnique({ where: { id: languageId } });
    if (!language) {
      throw new Error('Langue non trouvée');
    }
    return language;
  }

  async validateStep(stepId) {
    const step = await this.prisma.step.findUnique({ 
      where: { id: stepId },
      include: { path: true }
    });
    if (!step) {
      throw new Error('Étape non trouvée');
    }
    return step;
  }

  /**
   * Méthodes de gestion de la progression
   */
  async getOrCreateLanguageProgress(userId, languageId) {
    let progress = await this.prisma.userLanguageProgress.findUnique({
      where: { userId_languageId: { userId, languageId } }
    });

    if (!progress) {
      progress = await this.prisma.userLanguageProgress.create({
        data: {
          userId,
          languageId,
          status: ProgressionUnlockService.STATUS.NOT_STARTED,
          overallProgress: 0,
          totalXp: 0,
          totalTimeMinutes: 0
        }
      });
    }

    return progress;
  }

  async getOrCreateProgression(userId, elementType, elementId) {
    let progress;

    switch (elementType) {
      case ProgressionUnlockService.ELEMENT_TYPES.LEVEL:
        progress = await this.prisma.userLevelProgress.findUnique({
          where: { userId_levelId: { userId, levelId: elementId } }
        });
        if (!progress) {
          progress = await this.prisma.userLevelProgress.create({
            data: { userId, levelId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
          });
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.MODULE:
        progress = await this.prisma.userModuleProgress.findUnique({
          where: { userId_moduleId: { userId, moduleId: elementId } }
        });
        if (!progress) {
          progress = await this.prisma.userModuleProgress.create({
            data: { userId, moduleId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
          });
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.PATH:
        progress = await this.prisma.userPathProgress.findUnique({
          where: { userId_pathId: { userId, pathId: elementId } }
        });
        if (!progress) {
          progress = await this.prisma.userPathProgress.create({
            data: { userId, pathId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
          });
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.STEP:
        progress = await this.prisma.userStepProgress.findUnique({
          where: { userId_stepId: { userId, stepId: elementId } }
        });
        if (!progress) {
          progress = await this.prisma.userStepProgress.create({
            data: { userId, stepId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
          });
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.COURSE:
        if (this.prisma.userCourseProgress) {
          progress = await this.prisma.userCourseProgress.findUnique({
            where: { userId_courseId: { userId, courseId: elementId } }
          });
          if (!progress) {
            progress = await this.prisma.userCourseProgress.create({
              data: { userId, courseId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
            });
          }
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.EXERCISE:
        if (this.prisma.userExerciseProgress) {
          progress = await this.prisma.userExerciseProgress.findUnique({
            where: { userId_exerciseId: { userId, exerciseId: elementId } }
          });
          if (!progress) {
            progress = await this.prisma.userExerciseProgress.create({
              data: { userId, exerciseId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
            });
          }
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.QUIZ:
        if (this.prisma.userQuizProgress) {
          progress = await this.prisma.userQuizProgress.findUnique({
            where: { userId_quizId: { userId, quizId: elementId } }
          });
          if (!progress) {
            progress = await this.prisma.userQuizProgress.create({
              data: { userId, quizId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
            });
          }
        }
        break;
    }

    return progress;
  }

  async updateProgressStatus(userId, elementType, elementId, status, additionalData = {}) {
    const updateData = { status, ...additionalData };

    switch (elementType) {
      case ProgressionUnlockService.ELEMENT_TYPES.LEVEL:
        return await this.prisma.userLevelProgress.upsert({
          where: { userId_levelId: { userId, levelId: elementId } },
          update: updateData,
          create: { userId, levelId: elementId, ...updateData }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.MODULE:
        return await this.prisma.userModuleProgress.upsert({
          where: { userId_moduleId: { userId, moduleId: elementId } },
          update: updateData,
          create: { userId, moduleId: elementId, ...updateData }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.PATH:
        return await this.prisma.userPathProgress.upsert({
          where: { userId_pathId: { userId, pathId: elementId } },
          update: updateData,
          create: { userId, pathId: elementId, ...updateData }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.STEP:
        return await this.prisma.userStepProgress.upsert({
          where: { userId_stepId: { userId, stepId: elementId } },
          update: updateData,
          create: { userId, stepId: elementId, ...updateData }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.COURSE:
        if (this.prisma.userCourseProgress) {
          return await this.prisma.userCourseProgress.upsert({
            where: { userId_courseId: { userId, courseId: elementId } },
            update: updateData,
            create: { userId, courseId: elementId, ...updateData }
          });
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.EXERCISE:
        if (this.prisma.userExerciseProgress) {
          return await this.prisma.userExerciseProgress.upsert({
            where: { userId_exerciseId: { userId, exerciseId: elementId } },
            update: updateData,
            create: { userId, exerciseId: elementId, ...updateData }
          });
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.QUIZ:
        if (this.prisma.userQuizProgress) {
          return await this.prisma.userQuizProgress.upsert({
            where: { userId_quizId: { userId, quizId: elementId } },
            update: updateData,
            create: { userId, quizId: elementId, ...updateData }
          });
        }
        break;
    }
  }

  async updateLanguageStatus(userId, languageId, status) {
    return await this.prisma.userLanguageProgress.update({
      where: { userId_languageId: { userId, languageId } },
      data: { status }
    });
  }

  async getUserProgress(userId, elementType, elementId) {
    switch (elementType) {
      case ProgressionUnlockService.ELEMENT_TYPES.LEVEL:
        return await this.prisma.userLevelProgress.findUnique({
          where: { userId_levelId: { userId, levelId: elementId } }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.MODULE:
        return await this.prisma.userModuleProgress.findUnique({
          where: { userId_moduleId: { userId, moduleId: elementId } }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.PATH:
        return await this.prisma.userPathProgress.findUnique({
          where: { userId_pathId: { userId, pathId: elementId } }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.STEP:
        return await this.prisma.userStepProgress.findUnique({
          where: { userId_stepId: { userId, stepId: elementId } }
        });
    }
  }

  /**
   * Initialise la progression pour un utilisateur sur toutes les langues actives
   * Débloque module 1, parcours 1, étape 1 pour chaque langue
   */
  async initializeUserAllLanguages(userId) {
    const languages = await this.prisma.language.findMany({
      where: { isActive: true }
    });

    const results = [];
    for (const language of languages) {
      try {
        const result = await this.initializeUserLanguageProgress(userId, language.id);
        results.push({ languageId: language.id, languageName: language.name, ...result });
      } catch (err) {
        results.push({ languageId: language.id, languageName: language.name, success: false, error: err.message });
      }
    }

    return { success: true, message: 'Progression initialisée pour toutes les langues', data: results };
  }

  /**
   * Initialise la progression pour tous les utilisateurs sur toutes les langues actives
   */
  async initializeAllUsersAllLanguages() {
    const [users, languages] = await Promise.all([
      this.prisma.user.findMany({ where: { isActive: true }, select: { id: true, username: true } }),
      this.prisma.language.findMany({ where: { isActive: true }, select: { id: true, name: true } })
    ]);

    let totalSuccess = 0;
    let totalSkipped = 0;
    let totalError = 0;

    for (const user of users) {
      for (const language of languages) {
        try {
          const existing = await this.prisma.userLanguageProgress.findUnique({
            where: { userId_languageId: { userId: user.id, languageId: language.id } }
          });
          if (existing && existing.status !== ProgressionUnlockService.STATUS.NOT_STARTED) {
            totalSkipped++;
            continue;
          }
          await this.initializeUserLanguageProgress(user.id, language.id);
          totalSuccess++;
        } catch (err) {
          totalError++;
        }
      }
    }

    return {
      success: true,
      message: 'Initialisation globale terminée',
      data: { totalUsers: users.length, totalLanguages: languages.length, totalSuccess, totalSkipped, totalError }
    };
  }

  // Recalcule progressPercentage du level et overallProgress de la langue
  async recalculateLevelAndLanguage(userId, levelId) {
    const level = await this.prisma.level.findUnique({ where: { id: levelId } });
    if (!level) return;

    // % level = étapes complétées / total étapes du level
    const modulesInLevel = await this.prisma.module.findMany({ where: { levelId, isActive: true }, select: { id: true } });
    const moduleIds = modulesInLevel.map(m => m.id);
    const pathsInLevel = moduleIds.length > 0 ? await this.prisma.path.findMany({ where: { moduleId: { in: moduleIds }, isActive: true }, select: { id: true } }) : [];
    const pathIds = pathsInLevel.map(p => p.id);
    const stepsInLevel = pathIds.length > 0 ? await this.prisma.step.findMany({ where: { pathId: { in: pathIds }, isActive: true }, select: { id: true } }) : [];
    const stepIds = stepsInLevel.map(s => s.id);
    const completedInLevel = stepIds.length > 0 ? await this.prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIds }, status: 'completed' } }) : 0;
    const levelPct = stepIds.length > 0 ? Math.round((completedInLevel / stepIds.length) * 100) : 0;

    await this.prisma.userLevelProgress.updateMany({ where: { userId, levelId }, data: { progressPercentage: levelPct } });
    await this.recalculateLanguageProgress(userId, level.languageId);
  }

  // Recalcule overallProgress de la langue = étapes complétées / total étapes de la langue
  async recalculateLanguageProgress(userId, languageId) {
    const levelsInLang = await this.prisma.level.findMany({ where: { languageId, isActive: true }, select: { id: true } });
    const levelIds = levelsInLang.map(l => l.id);
    const modulesInLang = levelIds.length > 0 ? await this.prisma.module.findMany({ where: { levelId: { in: levelIds }, isActive: true }, select: { id: true } }) : [];
    const moduleIds = modulesInLang.map(m => m.id);
    const pathsInLang = moduleIds.length > 0 ? await this.prisma.path.findMany({ where: { moduleId: { in: moduleIds }, isActive: true }, select: { id: true } }) : [];
    const pathIds = pathsInLang.map(p => p.id);
    const stepsInLang = pathIds.length > 0 ? await this.prisma.step.findMany({ where: { pathId: { in: pathIds }, isActive: true }, select: { id: true } }) : [];
    const stepIds = stepsInLang.map(s => s.id);
    const completedInLang = stepIds.length > 0 ? await this.prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIds }, status: 'completed' } }) : 0;
    const overallPct = stepIds.length > 0 ? Math.round((completedInLang / stepIds.length) * 100) : 0;

    await this.prisma.userLanguageProgress.updateMany({ where: { userId, languageId }, data: { overallProgress: overallPct } });
  }

  /**
   * Méthodes de compatibilité avec l'interface existante
   */
  async unlockLevelForUser(userId, levelId) {
    return await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.LEVEL, levelId);
  }

  async unlockModuleForUser(userId, moduleId) {
    return await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.MODULE, moduleId);
  }

  async unlockPathForUser(userId, pathId) {
    return await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.PATH, pathId);
  }

  async unlockStepForUser(userId, stepId) {
    return await this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.STEP, stepId);
  }

  async completePathAndUnlockNext(userId, pathId) {
    await this.handlePathCompletion(userId, pathId);
  }

  // Recalcule les pourcentages sans déclencher la cascade de completion
  async handleStepProgressRecalculation(userId, pathId) {
    await recalculateAllProgress(userId, pathId);
  }

  async completeModuleAndUnlockNext(userId, moduleId) {
    await this.handleModuleCompletion(userId, moduleId);
  }

  async completeLevelAndUnlockNext(userId, levelId) {
    await this.handleLevelCompletion(userId, levelId);
  }
}

module.exports = new ProgressionUnlockService();
