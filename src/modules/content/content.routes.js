const express = require('express');
const controller = require('./content.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Content
 *   description: |
 *     Gestion des contenus d'un sous-thème et de leurs blocs.
 *
 *     Un sous-thème peut avoir plusieurs contenus en parallèle, de types différents :
 *
 *     | contentType | Rôle                                                    |
 *     |-------------|----------------------------------------------------------|
 *     | course      | Cours composé de blocs ordonnés (introduction/leçon/exemple/point important/récapitulatif) |
 *     | video       | Vidéo avec description et points à retenir              |
 *     | exercise    | Question avec réponses possibles et correction           |
 *     | resource    | Document PDF, lien ou fichier                            |
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ContentBlock:
 *       type: object
 *       properties:
 *         id:          { type: string }
 *         contentId:   { type: string }
 *         sectionType: { type: string, enum: [introduction, lesson, example, key_point, summary] }
 *         blockType:   { type: string, enum: [text, video, audio, pdf, image] }
 *         content:     { type: string, description: "Texte brut ou URL selon blockType" }
 *         caption:     { type: string, nullable: true }
 *         index:       { type: integer }
 *
 *     Content:
 *       type: object
 *       properties:
 *         id:          { type: string }
 *         subThemeId:  { type: string }
 *         contentType: { type: string, enum: [course, video, exercise, resource] }
 *         title:       { type: string }
 *         index:       { type: integer }
 *         isActive:    { type: boolean }
 *         blocks:
 *           type: array
 *           items: { $ref: '#/components/schemas/ContentBlock' }
 *
 *     ContentCreate:
 *       type: object
 *       required: [subThemeId, contentType, title]
 *       properties:
 *         subThemeId:  { type: string }
 *         contentType: { type: string, enum: [course, video, exercise, resource] }
 *         title:       { type: string, maxLength: 200 }
 *       examples:
 *         course:
 *           summary: Contenu de type cours
 *           value: { subThemeId: "sub_abc", contentType: "course", title: "Les salutations", summary: "Apprendre à saluer" }
 *         video:
 *           summary: Contenu de type vidéo
 *           value: { subThemeId: "sub_abc", contentType: "video", title: "Vidéo introduction", videoUrl: "https://res.cloudinary.com/.../video.mp4", description: "Vidéo d'introduction", keyPoints: ["Point 1", "Point 2"] }
 *         exercise:
 *           summary: Contenu de type exercice
 *           value: { subThemeId: "sub_abc", contentType: "exercise", title: "Exercice 1", statement: "Choisissez la bonne traduction", question: "Comment dit-on bonjour ?", possibleAnswers: ["I ni ce", "I ni wula"], correctAnswer: "I ni ce", explanation: "I ni ce signifie bonjour" }
 *         resource:
 *           summary: Contenu de type ressource
 *           value: { subThemeId: "sub_abc", contentType: "resource", title: "Fiche PDF", resourceType: "pdf", resourceUrl: "https://res.cloudinary.com/.../fiche.pdf" }
 *
 *     BlockCreate:
 *       type: object
 *       required: [sectionType, blockType, content]
 *       properties:
 *         sectionType: { type: string, enum: [introduction, lesson, example, key_point, summary] }
 *         blockType:   { type: string, enum: [text, video, audio, pdf, image] }
 *         content:     { type: string }
 *         caption:     { type: string, nullable: true }
 *         index:       { type: integer }
 */

// ─── Contenu ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/contents:
 *   get:
 *     summary: Liste paginée des contenus
 *     tags: [Content]
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
 *         name: subThemeId
 *         schema: { type: string }
 *       - in: query
 *         name: contentType
 *         schema: { type: string, enum: [course, video, exercise, resource] }
 *     responses:
 *       200:
 *         description: Liste paginée
 */
router.get('/', controller.getContents);

/**
 * @swagger
 * /api/v1/contents/sub-theme/{subThemeId}:
 *   get:
 *     summary: Contenus d'un sous-thème
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: subThemeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste des contenus du sous-thème
 */
router.get('/sub-theme/:subThemeId', controller.getContentsBySubThemeId);

/**
 * @swagger
 * /api/v1/contents/{id}:
 *   get:
 *     summary: Récupérer un contenu par ID (avec ses blocs)
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contenu trouvé
 */
router.get('/:id', controller.getContent);

/**
 * @swagger
 * /api/v1/contents:
 *   post:
 *     summary: Créer un contenu
 *     tags: [Content]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ContentCreate' }
 *     responses:
 *       201:
 *         description: Contenu créé
 */
router.post('/', controller.createContent);

/**
 * @swagger
 * /api/v1/contents/{id}:
 *   patch:
 *     summary: Modifier un contenu
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contenu mis à jour
 */
router.patch('/:id', controller.updateContent);

/**
 * @swagger
 * /api/v1/contents/{id}:
 *   delete:
 *     summary: Supprimer un contenu (et ses blocs)
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contenu supprimé
 */
router.delete('/:id', controller.deleteContent);

/**
 * @swagger
 * /api/v1/contents/{id}/submit:
 *   post:
 *     summary: Soumettre une réponse pour un contenu de type exercice
 *     tags: [Content]
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
 *             required: [userId, answer]
 *             properties:
 *               userId: { type: string }
 *               answer: { type: string }
 *     responses:
 *       200:
 *         description: Résultat de la soumission
 */
router.post('/:id/submit', controller.submitExercise);

/**
 * @swagger
 * /api/v1/contents/{id}/complete:
 *   post:
 *     summary: Marquer un contenu (course, video, resource) comme vu/consulté
 *     description: |
 *       Pour les contenus non-exercice, qui n'ont pas de notion de "bonne réponse".
 *       Ajoute ce contenu à completedContentIds du sous-thème et recalcule le %
 *       de progression jusqu'au module et au niveau. Un exercise doit passer par
 *       /submit à la place (409 sinon).
 *     tags: [Content]
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
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200:
 *         description: Contenu marqué comme vu, progression recalculée
 *       404:
 *         description: Contenu non trouvé
 */
router.post('/:id/complete', controller.completeContent);

// ─── Blocs (contentType = course) ───────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/contents/{id}/blocks:
 *   post:
 *     summary: Ajouter un bloc à un contenu de type "course"
 *     tags: [Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BlockCreate' }
 *     responses:
 *       201:
 *         description: Bloc ajouté
 */
router.post('/:id/blocks', controller.addBlock);

/**
 * @swagger
 * /api/v1/contents/{id}/blocks/reorder:
 *   patch:
 *     summary: Réordonner les blocs d'un contenu
 *     tags: [Content]
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
 *     responses:
 *       200:
 *         description: Blocs réordonnés
 */
router.patch('/:id/blocks/reorder', controller.reorderBlocks);

/**
 * @swagger
 * /api/v1/contents/{id}/blocks/{blockId}:
 *   patch:
 *     summary: Modifier un bloc
 *     tags: [Content]
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
 * /api/v1/contents/{id}/blocks/{blockId}:
 *   delete:
 *     summary: Supprimer un bloc
 *     tags: [Content]
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
