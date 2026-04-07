const express = require('express');
const controller = require('./course.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Course
 *   description: Gestion des cours (vidéo, audio, texte, pdf)
 */

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Liste paginée et filtrée des cours
 *     tags: [Course]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page de pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Nombre d'éléments par page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Recherche par titre
 *       - in: query
 *         name: stepId
 *         schema:
 *           type: string
 *         description: Filtrer par étape
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut de publication
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrer par statut actif
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
*         description: "Champ de tri (ex: createdAt)"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Ordre de tri
 *     responses:
 *       200:
 *         description: Liste des cours
 *       500:
 *         description: Erreur serveur
 */
router.get('/', controller.getCourses);

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
 *         schema:
 *           type: string
 *         description: ID du cours
 *     responses:
 *       200:
 *         description: Détail du cours
 *       404:
 *         description: Cours non trouvé
 */
router.get('/:id', controller.getCourse);

/**
 * @swagger
 * /api/v1/courses/{lessonId}/complete:
 *   post:
 *     summary: Marquer une leçon comme complétée
 *     description: Complète une leçon pour un utilisateur, met à jour la progression de l'étape et attribue des récompenses (XP, coins)
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la leçon
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID de l'utilisateur
 *                 example: "user123"
 *     responses:
 *       200:
 *         description: Leçon complétée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     lessonId:
 *                       type: string
 *                       description: ID de la leçon
 *                     lessonTitle:
 *                       type: string
 *                       description: Titre de la leçon
 *                     stepProgress:
 *                       type: object
 *                       description: Progression de l'étape mise à jour
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "completed"
 *                         progress:
 *                           type: integer
 *                           example: 100
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                     rewards:
 *                       type: object
 *                       properties:
 *                         xp:
 *                           type: integer
 *                           description: Points d'expérience gagnés
 *                           example: 10
 *                         coins:
 *                           type: integer
 *                           description: Pièces gagnées
 *                           example: 5
 *                     message:
 *                       type: string
 *                       example: "Leçon complétée avec succès !"
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Leçon non trouvée
 */
router.post('/:lessonId/complete', controller.completeLesson);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Créer un cours
 *     tags: [Course]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseCreate'
 *     responses:
 *       201:
 *         description: Cours créé
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
 *         schema:
 *           type: string
 *         description: ID du cours
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CourseUpdate'
 *     responses:
 *       200:
 *         description: Cours mis à jour
 *       400:
 *         description: Erreur de validation
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
 *         schema:
 *           type: string
 *         description: ID du cours
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CoursePatch'
 *     responses:
 *       200:
 *         description: Cours mis à jour partiellement
 *       400:
 *         description: Erreur de validation
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
 *         schema:
 *           type: string
 *         description: ID du cours
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
 *         schema:
 *           type: string
 *         description: ID du cours à dupliquer
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
 *     summary: Changer le statut de publication d'un cours
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du cours
 *     responses:
 *       200:
 *         description: Statut de publication modifié
 *       404:
 *         description: Cours non trouvé
 */
router.patch('/:id/toggle-publish', controller.toggleCoursePublish);

/**
 * @swagger
 * /api/v1/courses/level/{levelId}:
 *   get:
 *     summary: Lister les cours d'une étape (level)
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'étape
 *     responses:
 *       200:
 *         description: Liste des cours de l'étape
 *       404:
 *         description: Étape non trouvée
 */
router.get('/level/:levelId', controller.getCoursesByLevel);

/**
 * @swagger
 * /api/v1/courses/step/{stepId}/lessons:
 *   get:
 *     summary: Récupérer les lessons d'une étape avec progression utilisateur
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'étape
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur (optionnel, pour récupérer la progression)
 *     responses:
 *       200:
 *         description: Lesson récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     content:
 *                       type: string
 *                     videoUrl:
 *                       type: string
 *                       nullable: true
 *                     attachments:
 *                       type: object
 *                       nullable: true
 *                     index:
 *                       type: integer
 *                     stepId:
 *                       type: string
 *                     stepInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                         estimatedMinutes:
 *                           type: integer
 *                     userProgress:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [locked, started, completed]
 *                         progress:
 *                           type: integer
 *                         score:
 *                           type: integer
 *                           nullable: true
 *                         startedAt:
 *                           type: string
 *                           format: date-time
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *       404:
 *         description: Lesson non trouvée
 */
router.get('/step/:stepId/lessons', controller.getLessonsByStep);

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: clq1x2y3z4w5e6r7t8y9u0i1
 *         stepId:
 *           type: string
 *           example: clq1x2y3z4w5e6r7t8y9u0i1
 *         title:
 *           type: string
 *           example: Introduction à la grammaire
 *         description:
 *           type: string
 *           example: Ce cours couvre les bases de la grammaire française.
 *         contentType:
 *           type: string
 *           enum: [video, audio, text, pdf]
 *           example: video
 *         contentUrl:
 *           type: string
 *           example: https://cdn.lingualearn.com/courses/intro-grammaire.mp4
 *         duration:
 *           type: integer
 *           example: 1200
 *           description: Durée en secondes
 *         order:
 *           type: integer
 *           example: 1
 *         isPublished:
 *           type: boolean
 *           example: true
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-01-26T12:00:00.000Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2026-01-26T12:00:00.000Z
 *     CourseCreate:
 *       type: object
 *       required: [stepId, title, contentType, contentUrl]
 *       properties:
 *         stepId:
 *           type: string
 *           example: clq1x2y3z4w5e6r7t8y9u0i1
 *         title:
 *           type: string
 *           example: Introduction à la grammaire
 *         description:
 *           type: string
 *           example: Ce cours couvre les bases de la grammaire française.
 *         contentType:
 *           type: string
 *           enum: [video, audio, text, pdf]
 *           example: video
 *         contentUrl:
 *           type: string
 *           example: https://cdn.lingualearn.com/courses/intro-grammaire.mp4
 *         duration:
 *           type: integer
 *           example: 1200
 *         order:
 *           type: integer
 *           example: 1
 *         isPublished:
 *           type: boolean
 *           example: false
 *         isActive:
 *           type: boolean
 *           example: true
 *     CourseUpdate:
 *       type: object
 *       required: [title, contentType, contentUrl]
 *       properties:
 *         title:
 *           type: string
 *           example: Introduction à la grammaire
 *         description:
 *           type: string
 *           example: Ce cours couvre les bases de la grammaire française.
 *         contentType:
 *           type: string
 *           enum: [video, audio, text, pdf]
 *           example: video
 *         contentUrl:
 *           type: string
 *           example: https://cdn.lingualearn.com/courses/intro-grammaire.mp4
 *         duration:
 *           type: integer
 *           example: 1200
 *         order:
 *           type: integer
 *           example: 1
 *         isPublished:
 *           type: boolean
 *           example: true
 *         isActive:
 *           type: boolean
 *           example: true
 *     CoursePatch:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: Introduction à la grammaire
 *         description:
 *           type: string
 *           example: Ce cours couvre les bases de la grammaire française.
 *         contentType:
 *           type: string
 *           enum: [video, audio, text, pdf]
 *           example: video
 *         contentUrl:
 *           type: string
 *           example: https://cdn.lingualearn.com/courses/intro-grammaire.mp4
 *         duration:
 *           type: integer
 *           example: 1200
 *         order:
 *           type: integer
 *           example: 1
 *         isPublished:
 *           type: boolean
 *           example: true
 *         isActive:
 *           type: boolean
 *           example: true
 */

module.exports = router;