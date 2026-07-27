const express = require('express');
const controller = require('./course.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Course
 *   description: |
 *     Gestion des leçons et de leurs blocs de contenu.
 *
 *     Une leçon est composée de **blocs ordonnés**, chacun ayant un type de section et un type de contenu :
 *
 *     | sectionType     | Rôle                                      |
 *     |-----------------|-------------------------------------------|
 *     | introduction    | Texte court d'introduction                |
 *     | main            | Contenu principal (vidéo, audio, texte)   |
 *     | transcript      | Transcription texte d'un audio/vidéo      |
 *     | example         | Exemple textuel                           |
 *     | example_audio   | Exemple audio (prononciation)             |
 *     | key_points      | Points clés / résumé                      |
 *
 *     | contentType | Contenu attendu dans `content`            |
 *     |-------------|-------------------------------------------|
 *     | text        | Texte brut                                |
 *     | video       | URL (après upload via POST /uploads/video)|
 *     | audio       | URL (après upload via POST /uploads/audio)|
 *     | pdf         | URL                                       |
 *     | image       | URL                                       |
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LessonBlock:
 *       type: object
 *       properties:
 *         id:          { type: string }
 *         lessonId:    { type: string }
 *         sectionType: { type: string, enum: [introduction, main, transcript, example, example_audio, key_points] }
 *         contentType: { type: string, enum: [text, video, audio, pdf, image] }
 *         content:     { type: string, description: "Texte brut ou URL selon contentType" }
 *         caption:     { type: string, nullable: true }
 *         index:       { type: integer }
 *
 *     Lesson:
 *       type: object
 *       properties:
 *         id:       { type: string }
 *         stepId:   { type: string }
 *         title:    { type: string }
 *         summary:  { type: string, nullable: true }
 *         isActive: { type: boolean }
 *         blocks:
 *           type: array
 *           items: { $ref: '#/components/schemas/LessonBlock' }
 *
 *     LessonCreate:
 *       type: object
 *       required: [stepId, title]
 *       properties:
 *         stepId:  { type: string }
 *         title:   { type: string, maxLength: 200 }
 *         summary: { type: string, nullable: true }
 *
 *     BlockCreate:
 *       type: object
 *       required: [sectionType, contentType, content]
 *       properties:
 *         sectionType: { type: string, enum: [introduction, main, transcript, example, example_audio, key_points] }
 *         contentType: { type: string, enum: [text, video, audio, pdf, image] }
 *         content:     { type: string }
 *         caption:     { type: string, nullable: true }
 *         index:       { type: integer }
 *       examples:
 *         intro_text:
 *           summary: Introduction texte
 *           value: { sectionType: "introduction", contentType: "text", content: "Dans cette leçon, vous allez apprendre à saluer en Dioula." }
 *         main_video:
 *           summary: Contenu principal vidéo
 *           value: { sectionType: "main", contentType: "video", content: "https://res.cloudinary.com/lingualearn/video/upload/v1/..." }
 *         transcript:
 *           summary: Transcription
 *           value: { sectionType: "transcript", contentType: "text", content: "I ni ce signifie Bonjour en Dioula..." }
 *         example_audio:
 *           summary: Exemple audio
 *           value: { sectionType: "example_audio", contentType: "audio", content: "https://res.cloudinary.com/lingualearn/audio/upload/v1/..." }
 *         key_points:
 *           summary: Points clés
 *           value: { sectionType: "key_points", contentType: "text", content: "- I ni ce = Bonjour\n- I ni wula = Bonsoir" }
 */

// ─── Leçons ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Liste paginée des leçons
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
 *     responses:
 *       200:
 *         description: Liste paginée
 */
router.get('/', controller.getCourses);

/**
 * @swagger
 * /api/v1/courses/step/{stepId}/lessons:
 *   get:
 *     summary: Leçon d'une étape avec ses blocs et progression
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leçon avec blocs regroupés par section
 */
router.get('/step/:stepId/lessons', controller.getLessonsByStep);

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
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des leçons
 */
router.get('/user/:userId', controller.getCoursesByUserId);

/**
 * @swagger
 * /api/v1/courses/level/{levelId}:
 *   get:
 *     summary: Leçons d'un niveau
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des leçons du niveau
 */
router.get('/level/:levelId', controller.getCoursesByLevel);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Récupérer une leçon par ID (avec ses blocs)
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leçon trouvée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Lesson' }
 */
router.get('/:id', controller.getCourse);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Créer une leçon (sans blocs — ajouter les blocs ensuite)
 *     tags: [Course]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LessonCreate' }
 *     responses:
 *       201:
 *         description: Leçon créée
 */
router.post('/', controller.createCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Modifier une leçon (titre, résumé)
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leçon mise à jour
 */
router.put('/:id', controller.updateCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   patch:
 *     summary: Modifier partiellement une leçon
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leçon mise à jour
 */
router.patch('/:id', controller.patchCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Supprimer une leçon (et tous ses blocs)
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Leçon supprimée
 */
router.delete('/:id', controller.deleteCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/duplicate:
 *   post:
 *     summary: Dupliquer une leçon (et tous ses blocs)
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Leçon dupliquée
 */
router.post('/:id/duplicate',     controller.duplicateCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/toggle-publish:
 *   patch:
 *     summary: Activer/désactiver la publication d'une leçon
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Statut de publication basculé
 */
router.patch('/:id/toggle-publish', controller.toggleCoursePublish);

/**
 * @swagger
 * /api/v1/courses/{lessonId}/complete:
 *   post:
 *     summary: Marquer une leçon comme terminée pour un utilisateur
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
 *               userId: { type: string, example: 'user123' }
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/:lessonId/complete',  controller.completeLesson);

// ─── Blocs ─────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/courses/{id}/blocks:
 *   post:
 *     summary: Ajouter un bloc à une leçon
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID de la leçon
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BlockCreate' }
 *     responses:
 *       201:
 *         description: Bloc ajouté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/LessonBlock' }
 */
router.post('/:id/blocks', controller.addBlock);

/**
 * @swagger
 * /api/v1/courses/{id}/blocks/reorder:
 *   patch:
 *     summary: Réordonner les blocs d'une leçon
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
 *             type: object
 *             required: [orderedIds]
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: IDs des blocs dans le nouvel ordre
 *                 example: ["blk_abc", "blk_def", "blk_ghi"]
 *     responses:
 *       200:
 *         description: Blocs réordonnés, leçon retournée avec blocs dans le nouvel ordre
 */
router.patch('/:id/blocks/reorder', controller.reorderBlocks);

/**
 * @swagger
 * /api/v1/courses/{id}/blocks/{blockId}:
 *   patch:
 *     summary: Modifier un bloc
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bloc mis à jour
 */
router.patch('/:id/blocks/:blockId', controller.updateBlock);

/**
 * @swagger
 * /api/v1/courses/{id}/blocks/{blockId}:
 *   delete:
 *     summary: Supprimer un bloc
 *     tags: [Course]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bloc supprimé
 */
router.delete('/:id/blocks/:blockId', controller.deleteBlock);

module.exports = router;
