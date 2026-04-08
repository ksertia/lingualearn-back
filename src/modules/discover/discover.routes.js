const express = require('express');
const router = express.Router();
const discoverController = require('./discover.controller');
const { uploadCourseContent } = require('../../utils/uploadService');
const { authMiddleware, allowRoles } = require('../../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Discover
 *   description: Module de découverte des langues (sessions temporaires pour utilisateurs non connectés)
 * 
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   
 *   schemas:
 *     DiscoverLanguage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "lang_mo166_123"
 *         code:
 *           type: string
 *           example: "mo166"
 *         name:
 *           type: string
 *           example: "Mooré"
 *         description:
 *           type: string
 *           example: "Langue parlée au Burkina Faso"
 *         iconUrl:
 *           type: string
 *           nullable: true
 *         levels:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "intermediate"
 * 
 *     DiscoverExercise:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "ex_123"
 *         title:
 *           type: string
 *           example: "Salutation en Mooré"
 *         type:
 *           type: string
 *           enum: [audio, video, qcm, dragdrop]
 *           example: "audio"
 *         mediaUrl:
 *           type: string
 *           nullable: true
 *         text:
 *           type: string
 *           nullable: true
 *         translation:
 *           type: string
 *           nullable: true
 *         duration:
 *           type: integer
 *           nullable: true
 *         question:
 *           type: string
 *           nullable: true
 *         choices:
 *           type: array
 *           nullable: true
 *         correctAnswer:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 * 
 *     DiscoverLesson:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "lesson_mo166_int_1"
 *         title:
 *           type: string
 *           example: "Découvrir le Mooré"
 *         description:
 *           type: string
 *           example: "Une introduction au Mooré"
 *         languageCode:
 *           type: string
 *           example: "mo166"
 *         level:
 *           type: string
 *           example: "intermediate"
 *         thumbnailUrl:
 *           type: string
 *           nullable: true
 *         isPublished:
 *           type: boolean
 *           example: true
 *         totalExercises:
 *           type: integer
 *           example: 20
 *         sections:
 *           type: object
 *           properties:
 *             audio:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DiscoverExercise'
 *             video:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DiscoverExercise'
 *             qcm:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DiscoverExercise'
 *             dragdrop:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DiscoverExercise'
 * 
 *     DiscoverSession:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           example: "temp_1712680000_abc123xyz"
 *         totalScore:
 *           type: integer
 *           example: 15
 *         totalMaxScore:
 *           type: integer
 *           example: 20
 *         percentage:
 *           type: number
 *           format: float
 *           example: 75.5
 *         exercisesCompleted:
 *           type: integer
 *           example: 8
 *         startedAt:
 *           type: string
 *           format: date-time
 *         lastActivity:
 *           type: string
 *           format: date-time
 * 
 *     ExerciseResult:
 *       type: object
 *       properties:
 *         exerciseId:
 *           type: string
 *         exerciseType:
 *           type: string
 *           enum: [audio, video, qcm, dragdrop]
 *         score:
 *           type: integer
 *         maxScore:
 *           type: integer
 *         percentage:
 *           type: number
 *         feedback:
 *           type: object
 *         completed:
 *           type: boolean
 * 
 *     CreateLessonRequest:
 *       type: object
 *       required:
 *         - title
 *         - languageCode
 *         - sections
 *       properties:
 *         title:
 *           type: string
 *           example: "Apprendre le Mooré"
 *         description:
 *           type: string
 *           example: "Un module complet pour découvrir le Mooré"
 *         languageCode:
 *           type: string
 *           example: "mo166"
 *         level:
 *           type: string
 *           default: "intermediate"
 *           example: "intermediate"
 *         sections:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [audio, video, qcm, dragdrop]
 *               title:
 *                 type: string
 *               exercises:
 *                 type: array
 * 
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *         message:
 *           type: string
 *         pagination:
 *           type: object
 *           nullable: true
 *           properties:
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             total:
 *               type: integer
 *             totalPages:
 *               type: integer
 *             hasNext:
 *               type: boolean
 *             hasPrevious:
 *               type: boolean
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: string
 *           nullable: true
 */

// ==================== LANGUES ====================

/**
 * @swagger
 * /api/v1/discover/languages:
 *   get:
 *     tags: [Discover]
 *     summary: Récupérer les langues disponibles
 *     description: Retourne la liste des langues avec le niveau intermédiaire
 *     responses:
 *       200:
 *         description: Liste des langues
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DiscoverLanguage'
 */
router.get('/languages', discoverController.getLanguages);

// ==================== SESSIONS TEMPORAIRES ====================

/**
 * @swagger
 * /api/v1/discover/session/create:
 *   post:
 *     tags: [Discover]
 *     summary: Créer une session temporaire
 *     description: Crée une session pour stocker les scores sans authentification
 *     responses:
 *       200:
 *         description: Session créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sessionId:
 *                           type: string
 */
router.post('/session/create', discoverController.createSession);

/**
 * @swagger
 * /api/v1/discover/session/{sessionId}/score:
 *   get:
 *     tags: [Discover]
 *     summary: Récupérer le score d'une session
 *     description: Retourne le score total et les détails des exercices complétés
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         example: "temp_1712680000_abc123xyz"
 *     responses:
 *       200:
 *         description: Score récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DiscoverSession'
 *       404:
 *         description: Session non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/session/:sessionId/score', discoverController.getSessionScore);

// ==================== LEÇON DÉCOUVERTE ====================

/**
 * @swagger
 * /api/v1/discover/lesson:
 *   get:
 *     tags: [Discover]
 *     summary: Récupérer une leçon complète
 *     description: Retourne toutes les sections d'une leçon (audio, video, qcm, dragdrop)
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         example: "mo166"
 *         description: Code de la langue
 *     responses:
 *       200:
 *         description: Leçon récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DiscoverLesson'
 *       400:
 *         description: Paramètre languageCode manquant
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Leçon non trouvée
 */
router.get('/lesson', discoverController.getFullLesson);

// ==================== EXERCICES ====================

/**
 * @swagger
 * /api/v1/discover/exercises:
 *   get:
 *     tags: [Discover]
 *     summary: Récupérer les exercices avec pagination
 *     description: Retourne les exercices pour une langue
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         example: "mo166"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Exercices récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DiscoverExercise'
 *       400:
 *         description: Paramètre languageCode manquant
 */
router.get('/exercises', discoverController.getExercises);

/**
 * @swagger
 * /api/v1/discover/exercises/by-section:
 *   get:
 *     tags: [Discover]
 *     summary: Récupérer les exercices par section
 *     description: Retourne les exercices d'une section spécifique (audio, video, qcm, dragdrop)
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         example: "mo166"
 *       - in: query
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [audio, video, qcm, dragdrop]
 *         example: "audio"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Exercices de la section récupérés
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DiscoverExercise'
 *       400:
 *         description: Paramètres manquants ou invalides
 */
router.get('/exercises/by-section', discoverController.getExercisesBySection);

/**
 * @swagger
 * /api/v1/discover/exercises/{id}:
 *   get:
 *     tags: [Discover]
 *     summary: Récupérer un exercice par ID
 *     description: Retourne les détails d'un exercice spécifique
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "ex_123"
 *     responses:
 *       200:
 *         description: Exercice récupéré
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DiscoverExercise'
 *       404:
 *         description: Exercice non trouvé
 */
router.get('/exercises/:id', discoverController.getExerciseById);

/**
 * @swagger
 * /api/v1/discover/exercises/with-navigation:
 *   get:
 *     tags: [Discover]
 *     summary: Récupérer un exercice avec navigation
 *     description: Retourne un exercice avec les infos de navigation (précédent/suivant)
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         example: "mo166"
 *       - in: query
 *         name: currentIndex
 *         schema:
 *           type: integer
 *           default: 0
 *         example: 5
 *         description: Index de l'exercice courant
 *     responses:
 *       200:
 *         description: Exercice avec navigation
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         exercise:
 *                           $ref: '#/components/schemas/DiscoverExercise'
 *                         navigation:
 *                           type: object
 *                           properties:
 *                             currentIndex:
 *                               type: integer
 *                             total:
 *                               type: integer
 *                             hasPrevious:
 *                               type: boolean
 *                             hasNext:
 *                               type: boolean
 *                             previousExerciseId:
 *                               type: string
 *                               nullable: true
 *                             nextExerciseId:
 *                               type: string
 *                               nullable: true
 *       404:
 *         description: Exercice non trouvé
 */
router.get('/exercises/with-navigation', discoverController.getExerciseWithNavigation);

/**
 * @swagger
 * /api/v1/discover/exercises/{id}/submit:
 *   post:
 *     tags: [Discover]
 *     summary: Soumettre une réponse à un exercice
 *     description: Calcule le score et le sauvegarde dans la session
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "temp_1712680000_abc123xyz"
 *               answers:
 *                 type: object
 *                 example: { "selectedChoice": "option2" }
 *     responses:
 *       200:
 *         description: Réponse soumise avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         exerciseResult:
 *                           $ref: '#/components/schemas/ExerciseResult'
 *                         session:
 *                           $ref: '#/components/schemas/DiscoverSession'
 *       404:
 *         description: Exercice non trouvé
 */
router.post('/exercises/:id/submit', discoverController.submitExerciseAnswer);

// ==================== ADMIN - GESTION DES LEÇONS ====================

/**
 * @swagger
 * /api/v1/discover/admin/lessons:
 *   get:
 *     tags: [Discover (Admin)]
 *     security:
 *       - BearerAuth: []
 *     summary: Lister toutes les leçons (Admin)
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Liste des leçons
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DiscoverLesson'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.get('/admin/lessons', 
  authMiddleware, 
  allowRoles('admin', 'plateform_manager'), 
  discoverController.getAllLessons
);

/**
 * @swagger
 * /api/v1/discover/admin/lesson/create:
 *   post:
 *     tags: [Discover (Admin)]
 *     security:
 *       - BearerAuth: []
 *     summary: Créer une nouvelle leçon
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateLessonRequest'
 *     responses:
 *       200:
 *         description: Leçon créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DiscoverLesson'
 *       400:
 *         description: Paramètres invalides
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.post('/admin/lesson/create', 
  authMiddleware, 
  allowRoles('admin', 'plateform_manager'),
  uploadCourseContent.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'audioFiles', maxCount: 20 },
    { name: 'videoFiles', maxCount: 20 },
    { name: 'imageFiles', maxCount: 50 }
  ]),
  discoverController.createLesson
);

/**
 * @swagger
 * /api/v1/discover/admin/lesson/{id}:
 *   put:
 *     tags: [Discover (Admin)]
 *     security:
 *       - BearerAuth: []
 *     summary: Mettre à jour une leçon
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Leçon mise à jour
 *       404:
 *         description: Leçon non trouvée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.put('/admin/lesson/:id',
  authMiddleware, 
  allowRoles('admin', 'plateform_manager'),
  uploadCourseContent.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'audioFiles', maxCount: 20 },
    { name: 'videoFiles', maxCount: 20 },
    { name: 'imageFiles', maxCount: 50 }
  ]),
  discoverController.updateLesson
);

/**
 * @swagger
 * /api/v1/discover/admin/lesson/{id}:
 *   delete:
 *     tags: [Discover (Admin)]
 *     security:
 *       - BearerAuth: []
 *     summary: Supprimer une leçon
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leçon supprimée
 *       404:
 *         description: Leçon non trouvée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.delete('/admin/lesson/:id', 
  authMiddleware, 
  allowRoles('admin', 'plateform_manager'), 
  discoverController.deleteLesson
);

/**
 * @swagger
 * /api/v1/discover/admin/lesson/{id}/publish:
 *   patch:
 *     tags: [Discover (Admin)]
 *     security:
 *       - BearerAuth: []
 *     summary: Publier/Dépublier une leçon
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isPublished
 *             properties:
 *               isPublished:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Statut modifié
 *       404:
 *         description: Leçon non trouvée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.patch('/admin/lesson/:id/publish', 
  authMiddleware, 
  allowRoles('admin', 'plateform_manager'), 
  discoverController.publishLesson
);

/**
 * @swagger
 * /api/v1/discover/admin/upload/media:
 *   post:
 *     tags: [Discover (Admin)]
 *     security:
 *       - BearerAuth: []
 *     summary: Uploader un fichier média
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               type:
 *                 type: string
 *                 enum: [audio, video, image]
 *     responses:
 *       200:
 *         description: Fichier uploadé
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 */
router.post('/admin/upload/media', 
  authMiddleware, 
  allowRoles('admin', 'plateform_manager'),
  uploadCourseContent.single('file'),
  discoverController.uploadMedia
);

module.exports = router;