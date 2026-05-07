const { prisma } = require('../../config/prisma');
const { cacheWrap, cacheDel, cacheGet, cacheSet, TTL } = require('../../utils/cache');

// Cache les IDs de structure (steps d'un path/module/level/langue) — rarement modifiés
async function getStepIdsForPath(pathId) {
  return cacheWrap(`struct:path:${pathId}:stepIds`, () =>
    prisma.step.findMany({ where: { pathId, isActive: true }, select: { id: true } })
      .then(r => r.map(s => s.id)),
    TTL.LONG
  );
}

async function getStepIdsForModule(moduleId) {
  return cacheWrap(`struct:module:${moduleId}:stepIds`, async () => {
    const paths = await prisma.path.findMany({ where: { moduleId, isActive: true }, select: { id: true } });
    if (!paths.length) return [];
    const steps = await prisma.step.findMany({ where: { pathId: { in: paths.map(p => p.id) }, isActive: true }, select: { id: true } });
    return steps.map(s => s.id);
  }, TTL.LONG);
}

async function getStepIdsForLevel(levelId) {
  return cacheWrap(`struct:level:${levelId}:stepIds`, async () => {
    const modules = await prisma.module.findMany({ where: { levelId, isActive: true }, select: { id: true } });
    if (!modules.length) return [];
    const paths = await prisma.path.findMany({ where: { moduleId: { in: modules.map(m => m.id) }, isActive: true }, select: { id: true } });
    if (!paths.length) return [];
    const steps = await prisma.step.findMany({ where: { pathId: { in: paths.map(p => p.id) }, isActive: true }, select: { id: true } });
    return steps.map(s => s.id);
  }, TTL.LONG);
}

async function getStepIdsForLanguage(languageId) {
  return cacheWrap(`struct:language:${languageId}:stepIds`, async () => {
    const levels = await prisma.level.findMany({ where: { languageId, isActive: true }, select: { id: true } });
    if (!levels.length) return [];
    const modules = await prisma.module.findMany({ where: { levelId: { in: levels.map(l => l.id) }, isActive: true }, select: { id: true } });
    if (!modules.length) return [];
    const paths = await prisma.path.findMany({ where: { moduleId: { in: modules.map(m => m.id) }, isActive: true }, select: { id: true } });
    if (!paths.length) return [];
    const steps = await prisma.step.findMany({ where: { pathId: { in: paths.map(p => p.id) }, isActive: true }, select: { id: true } });
    return steps.map(s => s.id);
  }, TTL.LONG);
}

// Recalcule progressPercentage du parcours, module, level et overallProgress de la langue
async function recalculateAllProgress(userId, pathId) {
  try {
    // 1 requête pour toute la hiérarchie path → module → level → language
    const path = await prisma.path.findUnique({
      where: { id: pathId },
      include: { module: { include: { level: true } } }
    });
    if (!path) return;

    const moduleId = path.moduleId;
    const levelId = path.module.levelId;
    const languageId = path.module.level.languageId;

    // Récupérer tous les IDs de structure depuis le cache Redis (ou DB si absent)
    // Exécuté en parallèle — 0 requête DB si tout est en cache
    const [stepIdsInPath, stepIdsInModule, stepIdsInLevel, stepIdsInLang] = await Promise.all([
      getStepIdsForPath(pathId),
      getStepIdsForModule(moduleId),
      getStepIdsForLevel(levelId),
      getStepIdsForLanguage(languageId),
    ]);

    // Compter les étapes complétées pour chaque niveau — en parallèle
    const [completedInPath, completedInModule, completedInLevel, completedInLang] = await Promise.all([
      stepIdsInPath.length > 0
        ? prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIdsInPath }, status: 'completed' } })
        : Promise.resolve(0),
      stepIdsInModule.length > 0
        ? prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIdsInModule }, status: 'completed' } })
        : Promise.resolve(0),
      stepIdsInLevel.length > 0
        ? prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIdsInLevel }, status: 'completed' } })
        : Promise.resolve(0),
      stepIdsInLang.length > 0
        ? prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIdsInLang }, status: 'completed' } })
        : Promise.resolve(0),
    ]);

    const pct = (done, total) => total > 0 ? Math.round((done / total) * 100) : 0;

    // Mettre à jour tous les niveaux en parallèle
    await Promise.all([
      prisma.userPathProgress.updateMany({
        where: { userId, pathId },
        data: { progressPercentage: pct(completedInPath, stepIdsInPath.length) }
      }),
      prisma.userModuleProgress.updateMany({
        where: { userId, moduleId },
        data: { progressPercentage: pct(completedInModule, stepIdsInModule.length) }
      }),
      prisma.userLevelProgress.updateMany({
        where: { userId, levelId },
        data: { progressPercentage: pct(completedInLevel, stepIdsInLevel.length) }
      }),
      prisma.userLanguageProgress.updateMany({
        where: { userId, languageId },
        data: { overallProgress: pct(completedInLang, stepIdsInLang.length) }
      }),
    ]);

    // Invalider le cache de progression utilisateur
    await cacheDel(`user:${userId}:progress`);

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
  async initializeUserLanguageProgress(userId, languageId, targetLevelId = null) {
    try {
      await this.validateUser(userId);
      await this.validateLanguage(languageId);

      let languageProgress = await this.getOrCreateLanguageProgress(userId, languageId);

      // Récupérer tous les niveaux triés par index
      const allLevels = await this.prisma.level.findMany({
        where: { languageId, isActive: true },
        orderBy: { index: 'asc' }
      });

      if (!allLevels.length) {
        return { success: true, message: 'Progression initialisée avec succès', data: languageProgress };
      }

      const targetLevel = targetLevelId
        ? allLevels.find(l => l.id === targetLevelId)
        : allLevels[0];

      if (!targetLevel) throw new Error('Niveau cible introuvable');

      // Pour les niveaux inférieurs : débloquer le niveau + son premier module seulement
      const previousLevels = allLevels.filter(l => l.index < targetLevel.index);
      if (previousLevels.length > 0) {
        const firstModules = await Promise.all(previousLevels.map(l => this.getFirstModule(l.id)));
        await Promise.all(
          previousLevels.flatMap((prevLevel, i) => {
            const ops = [
              this.prisma.userLevelProgress.upsert({
                where: { userId_levelId: { userId, levelId: prevLevel.id } },
                update: { status: ProgressionUnlockService.STATUS.UNLOCKED, unlockedAt: new Date() },
                create: { userId, levelId: prevLevel.id, status: ProgressionUnlockService.STATUS.UNLOCKED, unlockedAt: new Date() }
              })
            ];
            if (firstModules[i]) {
              ops.push(
                this.prisma.userModuleProgress.upsert({
                  where: { userId_moduleId: { userId, moduleId: firstModules[i].id } },
                  update: { status: ProgressionUnlockService.STATUS.UNLOCKED, unlockedAt: new Date() },
                  create: { userId, moduleId: firstModules[i].id, status: ProgressionUnlockService.STATUS.UNLOCKED, unlockedAt: new Date() }
                })
              );
            }
            return ops;
          })
        );
      }

      // Débloquer le niveau cible + son premier module → parcours → étape
      await this.unlockLevelWithChildren(userId, targetLevel.id);
      languageProgress = await this.updateLanguageStatus(userId, languageId, ProgressionUnlockService.STATUS.STARTED);

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

    // 1 requête : toutes les progressions existantes (au lieu de N×M requêtes)
    const existingProgressions = await this.prisma.userLanguageProgress.findMany({
      where: { userId: { in: users.map(u => u.id) } },
      select: { userId: true, languageId: true, status: true }
    });
    const progressMap = new Set(
      existingProgressions
        .filter(p => p.status !== ProgressionUnlockService.STATUS.NOT_STARTED)
        .map(p => `${p.userId}_${p.languageId}`)
    );

    let totalSuccess = 0;
    let totalSkipped = 0;
    let totalError = 0;

    for (const user of users) {
      for (const language of languages) {
        // Vérification en mémoire — 0 requête DB
        if (progressMap.has(`${user.id}_${language.id}`)) {
          totalSkipped++;
          continue;
        }
        try {
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
    const level = await this.prisma.level.findUnique({ where: { id: levelId }, select: { id: true, languageId: true } });
    if (!level) return;

    // IDs depuis cache Redis — parallèle
    const [stepIdsInLevel, stepIdsInLang] = await Promise.all([
      getStepIdsForLevel(levelId),
      getStepIdsForLanguage(level.languageId),
    ]);

    const [completedInLevel, completedInLang] = await Promise.all([
      stepIdsInLevel.length > 0
        ? this.prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIdsInLevel }, status: 'completed' } })
        : Promise.resolve(0),
      stepIdsInLang.length > 0
        ? this.prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIdsInLang }, status: 'completed' } })
        : Promise.resolve(0),
    ]);

    const pct = (done, total) => total > 0 ? Math.round((done / total) * 100) : 0;

    await Promise.all([
      this.prisma.userLevelProgress.updateMany({
        where: { userId, levelId },
        data: { progressPercentage: pct(completedInLevel, stepIdsInLevel.length) }
      }),
      this.prisma.userLanguageProgress.updateMany({
        where: { userId, languageId: level.languageId },
        data: { overallProgress: pct(completedInLang, stepIdsInLang.length) }
      }),
    ]);

    await cacheDel(`user:${userId}:progress`);
  }

  // Recalcule overallProgress de la langue
  async recalculateLanguageProgress(userId, languageId) {
    const stepIds = await getStepIdsForLanguage(languageId);
    const completed = stepIds.length > 0
      ? await this.prisma.userStepProgress.count({ where: { userId, stepId: { in: stepIds }, status: 'completed' } })
      : 0;
    const pct = stepIds.length > 0 ? Math.round((completed / stepIds.length) * 100) : 0;

    await this.prisma.userLanguageProgress.updateMany({ where: { userId, languageId }, data: { overallProgress: pct } });
    await cacheDel(`user:${userId}:progress`);
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
