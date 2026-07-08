const express = require('express');
const controller = require('./course.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Course
 *   description: |
 *     Gestion des leçons (cours).
 *     **Flux d'ajout de contenu :**
 *     1. Si `contentType = text` → envoyer le texte directement dans `content`
 *     2. Si `contentType = video | audio | pdf | image` → uploader d'abord via `POST /api/v1/uploads/{type}`, récupérer l'URL retournée, puis l'envoyer dans `content`
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LessonContent:
 *       type: object
 *       description: |
 *         Le champ `content` contient :
 *         - du **texte brut** si `contentType = text`
 *         - une **URL** (retournée par /uploads) si `contentType = video | audio | pdf | image`
 *       properties:
 *         id:
 *           type: string
 *           example: clq1x2y3z4w5e6r7t8y9u0i1
 *         stepId:
 *           type: string
 *           example: clq1x2y3z4w5e6r7t8y9u0i2
 *         title:
 *           type: string
 *           example: Introduction à la grammaire
 *         contentType:
 *           type: string
 *           enum: [text, video, audio, pdf, image]
 *           example: text
 *         content:
 *           type: string
 *           example: "Bonjour signifie Hello en français."
 *           description: Texte brut (si text) ou URL du fichier (si video/audio/pdf/image)
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *           nullable: true
 *         index:
 *           type: integer
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     LessonCreate:
 *       type: object
 *       required: [stepId, title, content]
 *       properties:
 *         stepId:
 *           type: string
 *           example: clq1x2y3z4w5e6r7t8y9u0i2
 *         title:
 *           type: string
 *           example: Introduction à la grammaire
 *         contentType:
 *           type: string
 *           enum: [text, video, audio, pdf, image]
 *           default: text
 *           example: text
 *         content:
 *           type: string
 *           example: "Bonjour signifie Hello en français."
 *           description: |
 *             - `text` → saisir le texte directement ici
 *             - `video/audio/pdf/image` → mettre l'URL retournée par POST /uploads/{type}
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *           nullable: true
 *         isActive:
 *           type: boolean
 *           default: true
 *
 *     LessonUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         contentType:
 *           type: string
 *           enum: [text, video, audio, pdf, image]
 *         content:
 *           type: string
 *           description: Texte brut ou URL selon contentType
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *           nullable: true
 *         isActive:
 *           type: boolean
 */

/**
 * @swagger
 * /api/v1/courses/user/{userId}:
 *   get:
 *     summary: Leçons de l'utilisateur avec progression
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des leçons
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
 *                     $ref: '#/components/schemas/LessonContent'
 *       404:
 *         description: Aucune leçon trouvée
 */
router.get('/user/:userId', controller.getCoursesByUserId);

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Liste paginée des cours
 *     tags: [Course]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: stepId
 *         schema: { type: string }
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [text, video, audio, pdf, image]
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, default: createdAt }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Liste paginée
 */
router.get('/', controller.getCourses);

/**
 * @swagger
 * /api/v1/courses/step/{stepId}/lessons:
 *   get:
 *     summary: Leçon d'une étape avec progression utilisateur
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Optionnel — pour inclure la progression
 *     responses:
 *       200:
 *         description: Leçon avec progression
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/LessonContent'
 */
router.get('/step/:stepId/lessons', controller.getLessonsByStep);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Récupérer un cours par ID
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cours trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/LessonContent'
 *       404:
 *         description: Cours non trouvé
 */
router.get('/:id', controller.getCourse);

/**
 * @swagger
 * /api/v1/courses/{lessonId}/complete:
 *   post:
 *     summary: Marquer une leçon comme complétée
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200:
 *         description: Leçon complétée, récompenses attribuées
 *       400:
 *         description: Données invalides
 */
router.post('/:lessonId/complete', controller.completeLesson);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Créer un cours
 *     tags: [Course]
 *     description: |
 *       **Pour du texte :** envoyer `contentType=text` et `content="votre texte"`.
 *       **Pour une vidéo/audio/pdf/image :** uploader d'abord via `POST /api/v1/uploads/{type}`, puis mettre l'URL retournée dans `content`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LessonCreate'
 *           examples:
 *             texte:
 *               summary: Contenu texte
 *               value:
 *                 stepId: "clq1x2y3z4w5e6r7t8y9u0i2"
 *                 title: "Leçon 1 — Salutations"
 *                 contentType: "text"
 *                 content: "Bonjour signifie Hello en français."
 *             video:
 *               summary: Contenu vidéo (après upload)
 *               value:
 *                 stepId: "clq1x2y3z4w5e6r7t8y9u0i2"
 *                 title: "Leçon 1 — Vidéo"
 *                 contentType: "video"
 *                 content: "https://res.cloudinary.com/lingualearn/video/upload/v1/..."
 *     responses:
 *       201:
 *         description: Cours créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/LessonContent'
 *       400:
 *         description: Erreur de validation
 */
router.post('/', controller.createCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Modifier un cours (remplacement complet)
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LessonUpdate'
 *     responses:
 *       200:
 *         description: Cours mis à jour
 *       404:
 *         description: Cours non trouvé
 */
router.put('/:id', controller.updateCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   patch:
 *     summary: Modifier un cours (partiel)
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LessonUpdate'
 *     responses:
 *       200:
 *         description: Cours mis à jour
 *       404:
 *         description: Cours non trouvé
 */
router.patch('/:id', controller.patchCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Supprimer un cours
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cours supprimé
 *       404:
 *         description: Cours non trouvé
 */
router.delete('/:id', controller.deleteCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/duplicate:
 *   post:
 *     summary: Dupliquer un cours
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Cours dupliqué
 *       404:
 *         description: Cours non trouvé
 */
router.post('/:id/duplicate', controller.duplicateCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/toggle-publish:
 *   patch:
 *     summary: Activer / désactiver un cours
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Statut modifié
 *       404:
 *         description: Cours non trouvé
 */
router.patch('/:id/toggle-publish', controller.toggleCoursePublish);

/**
 * @swagger
 * /api/v1/courses/level/{levelId}:
 *   get:
 *     summary: Cours d'un niveau
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des cours du niveau
 */
router.get('/level/:levelId', controller.getCoursesByLevel);

module.exports = router;
