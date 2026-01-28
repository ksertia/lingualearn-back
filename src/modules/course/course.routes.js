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
 *         description: Champ de tri (ex: createdAt)
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
