const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const uploadService = require('../../utils/uploadService');
const languageService = require('../language/language.service');

// ==================== LANGUES ====================
exports.getLanguagesForDiscover = async () => {
  const allLanguages = await languageService.getAll();
  
  const languagesWithOnlyIntermediate = allLanguages
    .filter(language => language.levels && language.levels.some(level => level.code === 'intermediate'))
    .map(language => ({
      ...language.toObject ? language.toObject() : language,
      levels: language.levels.filter(level => level.code === 'intermediate')
    }));
  
  return languagesWithOnlyIntermediate;
};

// ==================== LEÇON DÉCOUVERTE ====================
/**
 * Récupère une leçon découverte complète avec ses 4 sections
 * Utilise les modèles DiscoverLesson, DiscoverSection, DiscoverExercise
 */
exports.getFullLesson = async (languageCode) => {
  try {
    // Récupérer la leçon découverte publiée pour cette langue
    const discoverLesson = await prisma.discoverLesson.findFirst({
      where: {
        languageCode: languageCode,
        level: 'intermediate',
        isPublished: true
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            exercises: true
          }
        }
      }
    });

    if (!discoverLesson) {
      return null;
    }

    // Organiser les exercices par type (audio, video, qcm, dragdrop)
    const sections = {
      audio: [],
      video: [],
      qcm: [],
      dragdrop: []
    };

    for (const section of discoverLesson.sections) {
      sections[section.type] = section.exercises.map(ex => ({
        id: ex.id,
        title: ex.title,
        mediaUrl: ex.mediaUrl,
        text: ex.text,
        translation: ex.translation,
        duration: ex.duration,
        thumbnailUrl: ex.thumbnailUrl,
        description: ex.description,
        question: ex.question,
        choices: ex.choices,
        correctAnswer: ex.correctAnswer,
        imageUrl: ex.imageUrl,
        imageAlt: ex.imageAlt,
        dragItems: ex.dragItems,
        dropZones: ex.dropZones,
        hint: ex.hint
      }));
    }

    return {
      id: discoverLesson.id,
      title: discoverLesson.title,
      description: discoverLesson.description,
      languageCode: discoverLesson.languageCode,
      level: discoverLesson.level,
      thumbnailUrl: discoverLesson.thumbnailUrl,
      isPublished: discoverLesson.isPublished,
      sections: sections,
      totalExercises: discoverLesson.sections.reduce((acc, s) => acc + s.exercises.length, 0)
    };
  } catch (error) {
    console.error('Error getting full lesson:', error);
    return null;
  }
};

// ==================== EXERCICES ====================
/**
 * Récupère tous les exercices (format plat) - version paginée directement BD
 * Optimisé pour éviter charger toute la leçon
 */
exports.getExercisesForDiscoverPaginated = async (languageCode, page = 1, limit = 10) => {
  try {
    // Récupérer le compte total des exercices pour cette langue
    const discoverLesson = await prisma.discoverLesson.findFirst({
      where: {
        languageCode: languageCode,
        level: 'intermediate',
        isPublished: true
      },
      select: { id: true }
    });

    if (!discoverLesson) {
      return { exercises: [], total: 0 };
    }

    // Récupérer les sections avec exercices paginés
    const sections = await prisma.discoverSection.findMany({
      where: { lessonId: discoverLesson.id },
      orderBy: { order: 'asc' },
      select: {
        type: true,
        exercises: {
          select: {
            id: true,
            title: true,
            mediaUrl: true,
            text: true,
            translation: true,
            duration: true,
            thumbnailUrl: true,
            description: true,
            question: true,
            choices: true,
            correctAnswer: true,
            imageUrl: true,
            imageAlt: true,
            dragItems: true,
            dropZones: true,
            hint: true
          }
        }
      }
    });

    // Aplatir et paginer
    let allExercises = [];
    const exerciseOrder = ['audio', 'video', 'qcm', 'dragdrop'];
    
    for (const type of exerciseOrder) {
      const section = sections.find(s => s.type === type);
      if (section) {
        allExercises.push(...section.exercises);
      }
    }

    const total = allExercises.length;
    const startIndex = (page - 1) * limit;
    const exercises = allExercises.slice(startIndex, startIndex + limit);

    return { exercises, total };
  } catch (error) {
    console.error('Error getting paginated exercises:', error);
    return { exercises: [], total: 0 };
  }
};

/**
 * Récupère tous les exercices (format plat)
 */
exports.getExercisesForDiscover = async (languageCode) => {
  const lesson = await exports.getFullLesson(languageCode);
  
  if (!lesson) {
    return [];
  }

  // Aplatir toutes les sections dans l'ordre: audio → video → qcm → dragdrop
  return [
    ...lesson.sections.audio,
    ...lesson.sections.video,
    ...lesson.sections.qcm,
    ...lesson.sections.dragdrop
  ];
};

/**
 * Récupère les exercices par section - avec pagination
 * Optimisé pour requête BD directe
 */
exports.getExercisesBySection = async (languageCode, sectionType, page = 1, limit = 10) => {
  try {
    // Trouver la leçon et la section
    const section = await prisma.discoverSection.findFirst({
      where: {
        lesson: {
          languageCode: languageCode,
          level: 'intermediate',
          isPublished: true
        },
        type: sectionType
      },
      select: {
        id: true,
        type: true,
        title: true,
        exercises: {
          select: {
            id: true,
            title: true,
            mediaUrl: true,
            text: true,
            translation: true,
            duration: true,
            thumbnailUrl: true,
            description: true,
            question: true,
            choices: true,
            correctAnswer: true,
            imageUrl: true,
            imageAlt: true,
            dragItems: true,
            dropZones: true,
            hint: true
          },
          skip: (page - 1) * limit,
          take: limit
        }
      }
    });

    if (!section) {
      return { exercises: [], total: 0 };
    }

    // Récupérer le total des exercices pour cette section
    const sectionFull = await prisma.discoverSection.findUnique({
      where: { id: section.id },
      select: { _count: { select: { exercises: true } } }
    });

    return { 
      exercises: section.exercises, 
      total: sectionFull._count.exercises,
      section: section.type
    };
  } catch (error) {
    console.error('Error getting exercises by section:', error);
    return { exercises: [], total: 0 };
  }
};

/**
 * Récupère un exercice par son ID
 */
exports.getExerciseById = async (exerciseId) => {
  const exercise = await prisma.discoverExercise.findUnique({
    where: { id: exerciseId },
    include: { section: true }
  });

  if (!exercise) return null;

  return {
    id: exercise.id,
    type: exercise.section.type,
    title: exercise.title,
    mediaUrl: exercise.mediaUrl,
    text: exercise.text,
    translation: exercise.translation,
    duration: exercise.duration,
    thumbnailUrl: exercise.thumbnailUrl,
    description: exercise.description,
    question: exercise.question,
    choices: exercise.choices,
    correctAnswer: exercise.correctAnswer,
    imageUrl: exercise.imageUrl,
    imageAlt: exercise.imageAlt,
    dragItems: exercise.dragItems,
    dropZones: exercise.dropZones,
    hint: exercise.hint
  };
};

// ==================== SCORE ====================
/**
 * Calcule le score pour un exercice
 */
exports.calculateScore = async (exerciseId, userAnswers) => {
  const exercise = await exports.getExerciseById(exerciseId);
  
  if (!exercise) {
    throw new Error('Exercise not found');
  }
  
  let score = 0;
  let maxScore = 0;
  let feedback = {};
  
  switch (exercise.type) {
    case 'audio':
      maxScore = 0;
      score = 0;
      feedback = { 
        message: 'Audio écouté avec succès 🎧',
        listened: userAnswers.listened || false
      };
      break;
      
    case 'video':
      maxScore = 0;
      score = 0;
      feedback = { 
        message: 'Vidéo visionnée avec succès 📹',
        watched: userAnswers.watched || false
      };
      break;
      
    case 'qcm':
      maxScore = 1;
      if (userAnswers.selectedChoice === exercise.correctAnswer) {
        score = 1;
        feedback = { correct: true, message: 'Bonne réponse ! ✓' };
      } else {
        feedback = { 
          correct: false, 
          message: `Incorrect. La bonne réponse était : ${exercise.correctAnswer}` 
        };
      }
      break;
      
    case 'dragdrop':
      maxScore = exercise.dropZones.length;
      let correctCount = 0;
      const zoneResults = [];
      
      for (const zone of exercise.dropZones) {
        const userItem = userAnswers.assignments?.[zone.id];
        const isCorrect = userItem === zone.expectedItem;
        if (isCorrect) correctCount++;
        zoneResults.push({
          zoneId: zone.id,
          label: zone.label,
          expected: zone.expectedItem,
          received: userItem || null,
          isCorrect
        });
      }
      score = correctCount;
      feedback = {
        correctCount,
        totalZones: maxScore,
        message: correctCount === maxScore ? 'Parfait ! 🎉' : `${correctCount}/${maxScore} bonnes associations`
      };
      break;
  }
  
  return {
    exerciseId,
    exerciseType: exercise.type,
    score,
    maxScore,
    percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
    feedback,
    completed: score === maxScore && maxScore > 0
  };
};

// ==================== LMS (ADMIN) ====================
/**
 * Crée une nouvelle leçon découverte
 */
exports.createLesson = async (lessonData, files) => {
  const {
    title,
    description,
    languageCode,
    level = 'intermediate',
    sections
  } = lessonData;

  // Sauvegarder la thumbnail si présente
  let thumbnailUrl = null;
  if (files?.thumbnail) {
    thumbnailUrl = uploadService.getFileUrl(files.thumbnail[0].filename);
  }

  // Créer la leçon découverte
  const discoverLesson = await prisma.discoverLesson.create({
    data: {
      title,
      description,
      languageCode,
      level,
      thumbnailUrl,
      isPublished: false,
      sections: {
        create: sections.map((section, idx) => ({
          type: section.type,
          order: idx + 1,
          title: section.title,
          exercises: {
            create: section.exercises.map(exercise => ({
              title: exercise.title,
              mediaUrl: exercise.mediaUrl,
              text: exercise.text,
              translation: exercise.translation,
              duration: exercise.duration,
              thumbnailUrl: exercise.thumbnailUrl,
              description: exercise.description,
              question: exercise.question,
              choices: exercise.choices,
              correctAnswer: exercise.correctAnswer,
              imageUrl: exercise.imageUrl,
              imageAlt: exercise.imageAlt,
              dragItems: exercise.dragItems,
              dropZones: exercise.dropZones,
              hint: exercise.hint
            }))
          }
        }))
      }
    },
    include: {
      sections: {
        include: { exercises: true }
      }
    }
  });

  return discoverLesson;
};

/**
 * Récupère toutes les leçons découverte (pour admin) - avec pagination
 * Optimisé pour éviter N+1 queries
 */
exports.getAllLessons = async (filters = {}, page = 1, limit = 10) => {
  try {
    const { languageCode, isPublished } = filters;
    
    const where = {};
    if (languageCode) where.languageCode = languageCode;
    if (isPublished !== undefined) where.isPublished = isPublished === 'true' || isPublished === true;
    
    // Récupérer le total
    const total = await prisma.discoverLesson.count({ where });
    
    // Récupérer les leçons paginées avec sections et un compte des exercices
    const lessons = await prisma.discoverLesson.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        languageCode: true,
        level: true,
        thumbnailUrl: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
        sections: {
          select: {
            id: true,
            type: true,
            title: true,
            order: true,
            _count: {
              select: { exercises: true }
            }
          },
          orderBy: { order: 'asc' }
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    // Enrichir avec le count d'exercices total
    const enrichedLessons = lessons.map(lesson => ({
      ...lesson,
      totalExercises: lesson.sections.reduce((acc, s) => acc + s._count.exercises, 0)
    }));

    return { lessons: enrichedLessons, total };
  } catch (error) {
    console.error('Error getting all lessons:', error);
    return { lessons: [], total: 0 };
  }
};

/**
 * Met à jour une leçon découverte
 */
exports.updateLesson = async (id, lessonData, files) => {
  const { title, description, level } = lessonData;
  
  let thumbnailUrl = undefined;
  if (files?.thumbnail) {
    thumbnailUrl = uploadService.getFileUrl(files.thumbnail[0].filename);
  }
  
  return await prisma.discoverLesson.update({
    where: { id },
    data: {
      title,
      description,
      level,
      ...(thumbnailUrl && { thumbnailUrl })
    },
    include: {
      sections: {
        include: { exercises: true }
      }
    }
  });
};

/**
 * Supprime une leçon découverte
 */
exports.deleteLesson = async (id) => {
  await prisma.discoverLesson.delete({ where: { id } });
  return true;
};

/**
 * Publie ou dépublie une leçon découverte
 */
exports.publishLesson = async (id, isPublished) => {
  return await prisma.discoverLesson.update({
    where: { id },
    data: { isPublished }
  });
};

/**
 * Upload d'un fichier média
 */
exports.uploadMedia = async (file, type) => {
  return {
    url: uploadService.getFileUrl(file.filename),
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    originalName: file.originalname,
    type: type
  };
};