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
 * Récupère les exercices par section
 */
exports.getExercisesBySection = async (languageCode, sectionType) => {
  const lesson = await exports.getFullLesson(languageCode);
  if (!lesson) return [];
  return lesson.sections[sectionType] || [];
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
 * Récupère toutes les leçons découverte (pour admin)
 */
exports.getAllLessons = async (filters = {}) => {
  const { languageCode, isPublished } = filters;
  
  const where = {};
  if (languageCode) where.languageCode = languageCode;
  if (isPublished !== undefined) where.isPublished = isPublished === 'true';
  
  return await prisma.discoverLesson.findMany({
    where,
    include: {
      sections: {
        include: { exercises: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
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