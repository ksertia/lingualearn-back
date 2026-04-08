const discoverService = require('./discover.service');
const sessionService = require('./session.service');

exports.getLanguages = async (req, res, next) => {
  try {
    const languages = await discoverService.getLanguagesForDiscover();
    res.json({
      success: true,
      data: languages,
      message: 'Langues récupérées avec succès'
    });
  } catch (err) {
    next(err);
  }
};

exports.getExercises = async (req, res, next) => {
  try {
    const { languageCode, page = 1, limit = 10 } = req.query;
    
    if (!languageCode) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre languageCode est requis'
      });
    }
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    
    const result = await discoverService.getExercisesForDiscoverPaginated(
      languageCode, 
      pageNum, 
      limitNum
    );
    
    res.json({
      success: true,
      data: result.exercises,
      languageCode,
      level: 'intermediate',
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
        hasNext: pageNum < Math.ceil(result.total / limitNum),
        hasPrevious: pageNum > 1
      },
      message: `Exercices pour ${languageCode} récupérés avec succès`
    });
  } catch (err) {
    next(err);
  }
};

exports.getFullLesson = async (req, res, next) => {
  try {
    const { languageCode } = req.query;
    
    if (!languageCode) {
      return res.status(400).json({
        success: false,
        message: 'Le paramètre languageCode est requis'
      });
    }
    
    const lesson = await discoverService.getFullLesson(languageCode);
    
    res.json({
      success: true,
      data: lesson,
      message: `Leçon pour ${languageCode} récupérée avec succès`
    });
  } catch (err) {
    next(err);
  }
};

exports.getExercisesBySection = async (req, res, next) => {
  try {
    const { languageCode, section, page = 1, limit = 10 } = req.query;
    
    if (!languageCode || !section) {
      return res.status(400).json({
        success: false,
        message: 'Les paramètres languageCode et section sont requis'
      });
    }
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    
    const result = await discoverService.getExercisesBySection(languageCode, section, pageNum, limitNum);
    
    res.json({
      success: true,
      data: result.exercises,
      section,
      languageCode,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
        hasNext: pageNum < Math.ceil(result.total / limitNum),
        hasPrevious: pageNum > 1
      },
      message: `Exercices de type ${section} récupérés`
    });
  } catch (err) {
    next(err);
  }
};

exports.getExerciseWithNavigation = async (req, res, next) => {
  try {
    const { languageCode, currentIndex } = req.query;
    const allExercises = await discoverService.getExercisesForDiscover(languageCode);
    
    const index = parseInt(currentIndex) || 0;
    const currentExercise = allExercises[index];
    
    if (!currentExercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercice non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: {
        exercise: currentExercise,
        navigation: {
          currentIndex: index,
          total: allExercises.length,
          hasPrevious: index > 0,
          hasNext: index < allExercises.length - 1,
          previousExerciseId: index > 0 ? allExercises[index - 1].id : null,
          nextExerciseId: index < allExercises.length - 1 ? allExercises[index + 1].id : null
        }
      },
      message: 'Exercice récupéré avec succès'
    });
  } catch (err) {
    next(err);
  }
};

exports.getExerciseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exercise = await discoverService.getExerciseById(id);
    
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercice non trouvé'
      });
    }
    
    res.json({
      success: true,
      data: exercise,
      message: 'Exercice récupéré avec succès'
    });
  } catch (err) {
    next(err);
  }
};

exports.submitExerciseAnswer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sessionId, answers } = req.body;
    
    if (!answers) {
      return res.status(400).json({
        success: false,
        message: 'Le champ answers est requis'
      });
    }
    
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await sessionService.initSession();
    } else {
      await sessionService.initSession(currentSessionId);
    }
    
    const scoreResult = await discoverService.calculateScore(id, answers);
    
    if (scoreResult.maxScore > 0) {
      await sessionService.saveExerciseScore(currentSessionId, id, scoreResult.score, scoreResult.maxScore);
    }
    
    const totalScore = await sessionService.getSessionScore(currentSessionId);
    
    res.json({
      success: true,
      data: {
        exerciseResult: scoreResult,
        session: {
          sessionId: currentSessionId,
          currentScore: totalScore?.totalScore || 0,
          totalPossibleScore: totalScore?.totalMaxScore || 0,
          completionPercentage: totalScore?.percentage || 0,
          exercisesCompleted: totalScore?.exercisesCompleted || 0
        }
      },
      message: 'Réponse soumise avec succès'
    });
  } catch (err) {
    next(err);
  }
};

exports.createSession = async (req, res, next) => {
  try {
    const sessionId = await sessionService.initSession();
    res.json({
      success: true,
      data: {
        sessionId
      },
      message: 'Session créée avec succès'
    });
  } catch (err) {
    next(err);
  }
};

exports.getSessionScore = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const score = await sessionService.getSessionScore(sessionId);
    
    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'Session non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: score,
      message: 'Score récupéré avec succès'
    });
  } catch (err) {
    next(err);
  }
};

// ==================== LMS (ADMIN) - GESTION DES LEÇONS ====================

/**
 * Créer une nouvelle leçon (LMS)
 * POST /api/v1/discover/lesson/create
 */
exports.createLesson = async (req, res, next) => {
  try {
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
    
    // Récupérer les champs
    let { title, description, languageCode, level, sections } = req.body;
    const files = req.files;
    
    // Vérifier les champs requis
    if (!title || !languageCode) {
      return res.status(400).json({
        success: false,
        message: 'Les champs title et languageCode sont requis'
      });
    }
    
    // Si sections n'existe pas, créer une section par défaut
    if (!sections) {
      sections = [];
    }
    
    // Parser sections si c'est une string
    let parsedSections = sections;
    if (typeof sections === 'string') {
      try {
        parsedSections = JSON.parse(sections);
      } catch (e) {
        console.error('JSON parse error:', e);
        return res.status(400).json({
          success: false,
          message: 'Le champ sections doit être un JSON valide',
          error: e.message
        });
      }
    }
    
    const lessonData = {
      title,
      description: description || '',
      languageCode,
      level: level || 'intermediate',
      sections: parsedSections
    };
    
    const lesson = await discoverService.createLesson(lessonData, files);
    
    res.json({
      success: true,
      data: lesson,
      message: 'Leçon créée avec succès'
    });
  } catch (err) {
    console.error('Create lesson error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la leçon',
      error: err.message
    });
  }
};

/**
 * Mettre à jour une leçon existante (LMS)
 * PUT /api/v1/discover/lesson/:id
 */
exports.updateLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lessonData = JSON.parse(req.body.lessonData);
    const files = req.files;
    
    const lesson = await discoverService.updateLesson(id, lessonData, files);
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Leçon non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: lesson,
      message: 'Leçon mise à jour avec succès'
    });
  } catch (err) {
    console.error('Update lesson error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la leçon',
      error: err.message
    });
  }
};

/**
 * Supprimer une leçon (LMS)
 * DELETE /api/v1/discover/lesson/:id
 */
exports.deleteLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const deleted = await discoverService.deleteLesson(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Leçon non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Leçon supprimée avec succès'
    });
  } catch (err) {
    console.error('Delete lesson error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la leçon',
      error: err.message
    });
  }
};

/**
 * Récupérer toutes les leçons (LMS - pour l'administration) - avec pagination
 * GET /api/v1/discover/admin/lessons
 */
exports.getAllLessons = async (req, res, next) => {
  try {
    const { languageCode, isPublished, page = 1, limit = 10 } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    
    const result = await discoverService.getAllLessons(
      { languageCode, isPublished }, 
      pageNum, 
      limitNum
    );
    
    res.json({
      success: true,
      data: result.lessons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
        hasNext: pageNum < Math.ceil(result.total / limitNum),
        hasPrevious: pageNum > 1
      },
      message: 'Leçons récupérées avec succès'
    });
  } catch (err) {
    console.error('Get all lessons error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des leçons',
      error: err.message
    });
  }
};

/**
 * Publier/Dépublier une leçon (LMS)
 * PATCH /api/v1/discover/lesson/:id/publish
 */
exports.publishLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    
    const lesson = await discoverService.publishLesson(id, isPublished);
    
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Leçon non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: lesson,
      message: isPublished ? 'Leçon publiée avec succès' : 'Leçon dépubliée avec succès'
    });
  } catch (err) {
    console.error('Publish lesson error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la publication de la leçon',
      error: err.message
    });
  }
};

/**
 * Upload de fichier média (LMS)
 * POST /api/v1/discover/upload/media
 */
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }
    
    const mediaInfo = await discoverService.uploadMedia(req.file, req.body.type);
    
    res.json({
      success: true,
      data: mediaInfo,
      message: 'Fichier uploadé avec succès'
    });
  } catch (err) {
    console.error('Upload media error:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload du fichier',
      error: err.message
    });
  }
};