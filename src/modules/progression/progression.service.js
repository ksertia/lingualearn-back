const { prisma } = require('../../config/prisma');

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

  // Débloquer le premier élément de chaque type trouvé
  const unlockPromises = [];
  
  // Pour une leçon (il n'y en a qu'une par étape d'après votre schéma)
  if (lesson) {
    // Si vous avez un modèle pour la progression des leçons, débloquez-le
    // Sinon, vous pouvez ignorer car les leçons n'ont pas de progression
    console.log(`Leçon trouvée pour l'étape ${stepId}: ${lesson.title}`);
  }
  
  // Débloquer le premier exercice
  if (exercises.length > 0) {
    unlockPromises.push(this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.EXERCISE, exercises[0].id));
  }
  
  // Débloquer le premier quiz
  if (quiz) {
    unlockPromises.push(this.unlockElement(userId, ProgressionUnlockService.ELEMENT_TYPES.QUIZ, quiz.id));
  }

  await Promise.all(unlockPromises);

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
    // Vérifier que le module existe
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) {
      throw new Error(`Module avec l'ID ${moduleId} introuvable`);
    }
    
    // Marquer le module comme complété
    await this.completeElement(userId, ProgressionUnlockService.ELEMENT_TYPES.MODULE, moduleId);

    // Récupérer le module suivant dans le même niveau
    const nextModule = await this.getNextModule(module.levelId, module.index);

    if (nextModule) {
      // Débloquer le module suivant
      await this.unlockModuleWithChildren(userId, nextModule.id);
    } else {
      // C'était le dernier module du niveau
      await this.handleLevelCompletion(userId, module.levelId);
    }
  }

  /**
   * Gère la complétion d'un niveau
   */
  async handleLevelCompletion(userId, levelId) {
    // Marquer le niveau comme complété
    await this.completeElement(userId, ProgressionUnlockService.ELEMENT_TYPES.LEVEL, levelId);

    // Récupérer le niveau suivant dans la même langue
    const level = await this.prisma.level.findUnique({ where: { id: levelId } });
    const nextLevel = await this.getNextLevel(level.languageId, level.index);

    if (nextLevel) {
      // Débloquer le niveau suivant
      await this.unlockLevelWithChildren(userId, nextLevel.id);
    } else {
      // C'était le dernier niveau de la langue
      await this.handleLanguageCompletion(userId, level.languageId);
    }
  }

  /**
   * Gère la complétion d'une langue
   */
  async handleLanguageCompletion(userId, languageId) {
    await this.updateLanguageStatus(userId, languageId, ProgressionUnlockService.STATUS.COMPLETED);
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
        progress = await this.prisma.userCourseProgress.findUnique({
          where: { userId_courseId: { userId, courseId: elementId } }
        });
        if (!progress) {
          progress = await this.prisma.userCourseProgress.create({
            data: { userId, courseId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
          });
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.EXERCISE:
        progress = await this.prisma.userExerciseProgress.findUnique({
          where: { userId_exerciseId: { userId, exerciseId: elementId } }
        });
        if (!progress) {
          progress = await this.prisma.userExerciseProgress.create({
            data: { userId, exerciseId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
          });
        }
        break;
      case ProgressionUnlockService.ELEMENT_TYPES.QUIZ:
        progress = await this.prisma.userQuizProgress.findUnique({
          where: { userId_quizId: { userId, quizId: elementId } }
        });
        if (!progress) {
          progress = await this.prisma.userQuizProgress.create({
            data: { userId, quizId: elementId, status: ProgressionUnlockService.STATUS.LOCKED }
          });
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
        return await this.prisma.userCourseProgress.upsert({
          where: { userId_courseId: { userId, courseId: elementId } },
          update: updateData,
          create: { userId, courseId: elementId, ...updateData }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.EXERCISE:
        return await this.prisma.userExerciseProgress.upsert({
          where: { userId_exerciseId: { userId, exerciseId: elementId } },
          update: updateData,
          create: { userId, exerciseId: elementId, ...updateData }
        });
      case ProgressionUnlockService.ELEMENT_TYPES.QUIZ:
        return await this.prisma.userQuizProgress.upsert({
          where: { userId_quizId: { userId, quizId: elementId } },
          update: updateData,
          create: { userId, quizId: elementId, ...updateData }
        });
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

  async completeModuleAndUnlockNext(userId, moduleId) {
    await this.handleModuleCompletion(userId, moduleId);
  }

  async completeLevelAndUnlockNext(userId, levelId) {
    await this.handleLevelCompletion(userId, levelId);
  }
}

module.exports = new ProgressionUnlockService();
