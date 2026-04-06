// const languageService = require('../language/language.service');

// exports.getLanguagesForDiscover = async () => {
//   const allLanguages = await languageService.getAll();
  
//   const languagesWithOnlyIntermediate = allLanguages
//     .filter(language => language.levels && language.levels.some(level => level.code === 'intermediate'))
//     .map(language => ({
//       ...language.toObject ? language.toObject() : language,
//       levels: language.levels.filter(level => level.code === 'intermediate')
//     }));
  
//   return languagesWithOnlyIntermediate;
// };

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const uploadService = require('../../utils/uploadService');
const languageService = require('../language/language.service');

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

/**
 * Récupère une leçon complète depuis Prisma
 */
exports.getFullLesson = async (languageId) => {
  try {
    // Récupérer la leçon via les relations Step -> Path -> Module -> Level -> Language
    const lesson = await prisma.lesson.findFirst({
      where: {
        step: {
          path: {
            module: {
              level: {
                languageId: languageId
              }
            }
          }
        }
      },
      include: {
        step: {
          include: {
            path: {
              include: {
                module: {
                  include: {
                    level: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!lesson) {
      return null;
    }

    // Retourner la leçon avec ses relations
    return {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      attachments: lesson.attachments,
      index: lesson.index,
      step: lesson.step
    };
  } catch (error) {
    console.error('Error getting full lesson:', error);
    return null;
  }
};

/**
 * Crée une nouvelle leçon (LMS)
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
  if (files.thumbnail) {
    thumbnailUrl = uploadService.getFileUrl(files.thumbnail[0].filename);
  }

  // Créer la leçon
  const lesson = await prisma.lesson.create({
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

  return lesson;
};

/**
 * Upload d'un fichier média (LMS)
 */
exports.uploadMedia = async (file, type) => {
  // Le fichier est déjà sauvegardé par multer
  // Il suffit de retourner l'URL
  return {
    url: uploadService.getFileUrl(file.filename),
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    originalName: file.originalname
  };
};

/**
 * Récupère tous les exercices (version simple pour compatibilité)
 */
exports.getExercisesForDiscover = async (languageCode = null) => {
  const lesson = await exports.getFullLesson(languageCode);
  
  if (!lesson) {
    return [];
  }

  // Aplatir toutes les sections en un seul tableau
  const allExercises = [
    ...lesson.sections.audio,
    ...lesson.sections.video,
    ...lesson.sections.qcm,
    ...lesson.sections.dragdrop
  ];

  return allExercises;
};

/**
 * Récupère un exercice par son ID
 */
exports.getExerciseById = async (exerciseId) => {
  const exercise = await prisma.exercise.findUnique({
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

/**
 * Calcule le score
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

// Garder les autres fonctions exports.getExercisesBySection, etc.
exports.getExercisesBySection = async (languageCode, sectionType) => {
  const lesson = await exports.getFullLesson(languageCode);
  if (!lesson) return [];
  return lesson.sections[sectionType] || [];
};