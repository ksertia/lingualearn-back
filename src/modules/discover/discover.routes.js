const express = require('express');
const router = express.Router();
const discoverController = require('./discover.controller');
const { uploadCourseContent } = require('../../utils/uploadService');

/**
 * @swagger
 * components:
 *   schemas:
 *     Language:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         levels:
 *           type: array
 *           items:
 *             type: object
 *     Exercise:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [audio, video, qcm, dragdrop]
 *         title:
 *           type: string
 *         languageCode:
 *           type: string
 *         level:
 *           type: string
 *     SessionScore:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *         totalScore:
 *           type: integer
 *         totalMaxScore:
 *           type: integer
 *         percentage:
 *           type: number
 */

// ==================== LANGUES ====================

/**
 * @swagger
 * /api/v1/discover/languages:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer les langues pour la découverte
 *     description: Retourne la liste des langues disponibles niveau intermédiaire uniquement
 *     responses:
 *       200:
 *         description: Liste des langues
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Language'
 *                 message:
 *                   type: string
 */
router.get('/languages', discoverController.getLanguages);

// ==================== SESSIONS TEMPORAIRES ====================

/**
 * @swagger
 * /api/v1/discover/session/create:
 *   post:
 *     tags:
 *       - Discover
 *     summary: Créer une session temporaire
 *     description: Crée une session pour stocker les scores sans authentification
 *     responses:
 *       200:
 *         description: Session créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                     message:
 *                       type: string
 */
router.post('/session/create', discoverController.createSession);

/**
 * @swagger
 * /api/v1/discover/session/{sessionId}/score:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer le score d'une session
 *     description: Retourne le score total et les détails des exercices complétés
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la session temporaire
 *     responses:
 *       200:
 *         description: Score récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SessionScore'
 *       404:
 *         description: Session non trouvée
 */
router.get('/session/:sessionId/score', discoverController.getSessionScore);

// ==================== LEÇON COMPLÈTE ====================

/**
 * @swagger
 * /api/v1/discover/lesson:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer une leçon complète
 *     description: Retourne toutes les sections d'une leçon audio video qcm dragdrop dans l'ordre
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code de la langue mossi dioula fon
 *     responses:
 *       200:
 *         description: Leçon récupérée avec succès
 *       400:
 *         description: Paramètre languageCode manquant
 */
router.get('/lesson', discoverController.getFullLesson);

// ==================== EXERCICES PAR SECTION ====================

/**
 * @swagger
 * /api/v1/discover/exercises/section:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer les exercices par section
 *     description: Retourne les exercices d'un type spécifique audio video qcm dragdrop
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code de la langue
 *       - in: query
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [audio, video, qcm, dragdrop]
 *         description: Type d'exercice à filtrer
 *     responses:
 *       200:
 *         description: Exercices récupérés avec succès
 *       400:
 *         description: Paramètres manquants
 */
router.get('/exercises/section', discoverController.getExercisesBySection);

// ==================== EXERCICE AVEC NAVIGATION ====================

/**
 * @swagger
 * /api/v1/discover/exercises/navigate:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer un exercice avec navigation Précédent Suivant
 *     description: Retourne un exercice spécifique avec les informations de navigation
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code de la langue
 *       - in: query
 *         name: currentIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Index actuel dans la liste des exercices
 *     responses:
 *       200:
 *         description: Exercice récupéré avec succès
 *       404:
 *         description: Exercice non trouvé
 */
router.get('/exercises/navigate', discoverController.getExerciseWithNavigation);

// ==================== EXERCICES STANDARDS ====================

/**
 * @swagger
 * /api/v1/discover/exercises:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer tous les exercices
 *     description: Retourne la liste des exercices pour une langue niveau intermédiaire
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code de la langue mossi dioula fon
 *     responses:
 *       200:
 *         description: Liste des exercices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Exercise'
 *                 languageCode:
 *                   type: string
 *                 level:
 *                   type: string
 *                 total:
 *                   type: integer
 *       400:
 *         description: Paramètre languageCode manquant
 */
router.get('/exercises', discoverController.getExercises);

/**
 * @swagger
 * /api/v1/discover/exercises/{id}:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer un exercice spécifique
 *     description: Retourne les détails d'un exercice par son ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'exercice
 *     responses:
 *       200:
 *         description: Exercice trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Exercise'
 *       404:
 *         description: Exercice non trouvé
 */
router.get('/exercises/:id', discoverController.getExerciseById);

/**
 * @swagger
 * /api/v1/discover/exercises/{id}/submit:
 *   post:
 *     tags:
 *       - Discover
 *     summary: Soumettre une réponse à un exercice
 *     description: Calcule le score et le sauvegarde dans la session temporaire
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'exercice
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: ID de session temporaire optionnel
 *               answers:
 *                 type: object
 *                 description: Réponses selon le type d'exercice
 *     responses:
 *       200:
 *         description: Réponse soumise avec succès
 *       404:
 *         description: Exercice non trouvé
 */
router.post('/exercises/:id/submit', discoverController.submitExerciseAnswer);

// ==================== LMS (ADMIN) - GESTION DES LEÇONS ====================
// Ces routes sont pour l'interface d'administration (LMS)

/**
 * @swagger
 * /api/v1/discover/lessons:
 *   get:
 *     tags:
 *       - Discover (Admin)
 *     summary: Récupérer toutes les leçons (Admin)
 *     description: Retourne la liste de toutes les leçons avec filtres optionnels
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *         description: Filtrer par code de langue
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut de publication
 *     responses:
 *       200:
 *         description: Liste des leçons
 */
router.get('/lessons', discoverController.getAllLessons);

/**
 * @swagger
 * /api/v1/discover/lesson/create:
 *   post:
 *     tags:
 *       - Discover (Admin)
 *     summary: Créer une nouvelle leçon (Admin)
 *     description: Crée une nouvelle leçon avec ses sections et exercices
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               lessonData:
 *                 type: string
 *                 description: Données JSON de la leçon
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               audioFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               videoFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               imageFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Leçon créée avec succès
 */
router.post('/lesson/create', 
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
 * /api/v1/discover/lesson/{id}:
 *   put:
 *     tags:
 *       - Discover (Admin)
 *     summary: Mettre à jour une leçon (Admin)
 *     description: Modifie une leçon existante
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
 *               lessonData:
 *                 type: string
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Leçon mise à jour avec succès
 *       404:
 *         description: Leçon non trouvée
 */
router.put('/lesson/:id',
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
 * /api/v1/discover/lesson/{id}:
 *   delete:
 *     tags:
 *       - Discover (Admin)
 *     summary: Supprimer une leçon (Admin)
 *     description: Supprime définitivement une leçon
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leçon supprimée avec succès
 *       404:
 *         description: Leçon non trouvée
 */
router.delete('/lesson/:id', discoverController.deleteLesson);

/**
 * @swagger
 * /api/v1/discover/lesson/{id}/publish:
 *   patch:
 *     tags:
 *       - Discover (Admin)
 *     summary: Publier/Dépublier une leçon (Admin)
 *     description: Change le statut de publication d'une leçon
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
 *             properties:
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Statut modifié avec succès
 *       404:
 *         description: Leçon non trouvée
 */
router.patch('/lesson/:id/publish', discoverController.publishLesson);

/**
 * @swagger
 * /api/v1/discover/upload/media:
 *   post:
 *     tags:
 *       - Discover (Admin)
 *     summary: Uploader un fichier média (Admin)
 *     description: Upload un fichier audio, vidéo ou image
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               type:
 *                 type: string
 *                 enum: [audio, video, image]
 *     responses:
 *       200:
 *         description: Fichier uploadé avec succès
 */
router.post('/upload/media', 
  uploadCourseContent.single('file'),
  discoverController.uploadMedia
);

module.exports = router;