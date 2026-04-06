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
 *     responses:
 *       200:
 *         description: Score récupéré avec succès
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
 *     description: Retourne toutes les sections d'une leçon (audio, video, qcm, dragdrop) dans l'ordre
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code de la langue (mossi, dioula, fulfulde)
 *     responses:
 *       200:
 *         description: Leçon récupérée avec succès
 *       400:
 *         description: Paramètre languageCode manquant
 *       404:
 *         description: Leçon non trouvée
 */
router.get('/lesson', discoverController.getFullLesson);

// ==================== EXERCICES ====================

/**
 * @swagger
 * /api/v1/discover/exercises:
 *   get:
 *     tags:
 *       - Discover
 *     summary: Récupérer tous les exercices
 *     description: Retourne la liste des exercices pour une langue (format plat)
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code de la langue (mossi, dioula, fulfulde)
 *     responses:
 *       200:
 *         description: Liste des exercices
 *       400:
 *         description: Paramètre languageCode manquant
 */
router.get('/exercises', discoverController.getExercises);

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               answers:
 *                 type: object
 *     responses:
 *       200:
 *         description: Réponse soumise avec succès
 *       404:
 *         description: Exercice non trouvé
 */
router.post('/exercises/:id/submit', discoverController.submitExerciseAnswer);

// ==================== LMS (ADMIN) - GESTION DES LEÇONS ====================

/**
 * @swagger
 * /api/v1/discover/lessons:
 *   get:
 *     tags:
 *       - Discover (Admin)
 *     summary: Récupérer toutes les leçons (Admin)
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
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