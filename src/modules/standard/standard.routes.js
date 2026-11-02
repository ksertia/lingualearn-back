const express = require('express');
const controller = require('./standard.controller');
const { allowSelfOrRoles, allowRoles } = require('../../middleware/authMiddleware');
const { uploadCourseContent } = require('../../utils/uploadService');
const router = express.Router();

// Monté dans src/routes/index.js sous authMiddleware + requireSubscription,
// même gating que /themes, /progress, /gamification.
const selfOrAdmin = allowSelfOrRoles('userId', 'admin', 'plateform_manager');
const adminOnly = allowRoles('admin', 'plateform_manager');

/**
 * @swagger
 * tags:
 *   name: Standard
 *   description: |
 *     Mode Standard — courtes sessions guidées (3-4 min), servies une à une et
 *     dans l'ordre pour la langue suivie. Remplace le contenu moqué et le
 *     curseur local de l'app mobile.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     StandardItem:
 *       type: object
 *       properties:
 *         id:                 { type: string }
 *         type:               { type: string, enum: [vocabulary, phrase, quiz, translate] }
 *         term:               { type: string, nullable: true }
 *         translation:        { type: string, nullable: true }
 *         example:            { type: string, nullable: true }
 *         exampleTranslation: { type: string, nullable: true }
 *         audioUrl:           { type: string, nullable: true, description: "URL HTTPS de l'enregistrement en langue locale" }
 *         question:           { type: string, nullable: true }
 *         options:
 *           type: array
 *           items: { type: string }
 *           nullable: true
 *         answerIndex:        { type: integer, nullable: true }
 *         sentence:           { type: string, nullable: true }
 *         answerWords:
 *           type: array
 *           items: { type: string }
 *           nullable: true
 *         distractors:
 *           type: array
 *           items: { type: string }
 *           nullable: true
 *         fromFrench:         { type: boolean, nullable: true }
 *
 *     StandardSession:
 *       type: object
 *       properties:
 *         id:               { type: string, example: "8f1c..." }
 *         title:             { type: string, example: "Saluer au fil de la journée" }
 *         estimatedMinutes:  { type: integer, example: 3 }
 *         items:
 *           type: array
 *           items: { $ref: '#/components/schemas/StandardItem' }
 *
 *     StandardSessionPreview:
 *       type: object
 *       properties:
 *         id:               { type: string }
 *         title:            { type: string }
 *         estimatedMinutes: { type: integer }
 *         cardCount:        { type: integer, description: "Nombre de cartes vocabulary/phrase" }
 *         exerciseCount:    { type: integer, description: "Nombre d'exercices quiz/translate" }
 *
 *     StandardError:
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         error:   { type: string }
 *         code:    { type: string, enum: [STANDARD_NOT_FOUND, STANDARD_NO_CONTENT] }
 */

/**
 * @swagger
 * /api/v1/standard/languages/{languageId}/next-session:
 *   get:
 *     summary: Session complète à jouer maintenant
 *     description: |
 *       Résout le curseur de progression de l'utilisateur dans cette langue
 *       (créé à 1 au premier appel) et renvoie la session publiée correspondante.
 *       Si la position n'est plus publiée, renvoie la suivante publiée ; si la fin
 *       du catalogue est dépassée, boucle sur la première session publiée.
 *     tags: [Standard]
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session complète
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/StandardSession' }
 *       403:
 *         description: Vous ne pouvez consulter que votre propre session, sauf admin/plateform_manager
 *       404:
 *         description: Langue inconnue, ou langue connue sans aucune session publiée
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 */
router.get('/languages/:languageId/next-session', selfOrAdmin, controller.getNextSession);

/**
 * @swagger
 * /api/v1/standard/languages/{languageId}/next-session/preview:
 *   get:
 *     summary: Aperçu léger pour la carte « Standard » de l'accueil
 *     tags: [Standard]
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Aperçu de la prochaine session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/StandardSessionPreview' }
 *       403:
 *         description: Vous ne pouvez consulter que votre propre aperçu, sauf admin/plateform_manager
 *       404:
 *         description: Langue inconnue, ou langue connue sans aucune session publiée
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 */
router.get('/languages/:languageId/next-session/preview', selfOrAdmin, controller.getNextSessionPreview);

/**
 * @swagger
 * /api/v1/standard/sessions/{sessionId}/complete:
 *   post:
 *     summary: Enregistre la fin d'une session et avance le curseur
 *     description: |
 *       Idempotent via `requestId` : un renvoi après coupure réseau avec le même
 *       `requestId` renvoie le premier résultat sans créer de doublon ni avancer
 *       le curseur deux fois. `stars` est calculé côté serveur (3 si tout juste,
 *       2 si au moins la moitié, sinon 1).
 *     tags: [Standard]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, languageId, correctAnswers, exerciseCount, durationSeconds, requestId]
 *             properties:
 *               userId:          { type: string }
 *               languageId:      { type: string }
 *               correctAnswers:  { type: integer, example: 3 }
 *               exerciseCount:   { type: integer, example: 4 }
 *               durationSeconds: { type: integer, example: 185 }
 *               requestId:       { type: string, description: "UUID généré par l'app, pour l'idempotence" }
 *     responses:
 *       200:
 *         description: Résultat enregistré (ou renvoyé si requestId déjà connu)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     resultId:    { type: string }
 *                     nextSession: { $ref: '#/components/schemas/StandardSessionPreview' }
 *       400:
 *         description: correctAnswers supérieur à exerciseCount, ou négatif — rien n'est enregistré
 *       403:
 *         description: Vous ne pouvez enregistrer un résultat que pour vous-même, sauf admin/plateform_manager
 *       404:
 *         description: Session inconnue
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 */
router.post('/sessions/:sessionId/complete', controller.completeSession);

/**
 * @swagger
 * /api/v1/standard/users/{userId}/languages/{languageId}/stats:
 *   get:
 *     summary: Chiffres pour la page Progression
 *     tags: [Standard]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Statistiques de l'utilisateur pour cette langue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionsCompleted: { type: integer }
 *                     wordsLearned:      { type: integer }
 *                     correctAnswers:    { type: integer }
 *                     exerciseCount:     { type: integer }
 *                     lastCompletedAt:   { type: string, format: date-time, nullable: true }
 *       403:
 *         description: Vous ne pouvez consulter que vos propres statistiques, sauf admin/plateform_manager
 *       404:
 *         description: Langue inconnue
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 */
router.get('/users/:userId/languages/:languageId/stats', selfOrAdmin, controller.getUserLanguageStats);

/**
 * @swagger
 * /api/v1/standard/children/{childId}/languages/{languageId}/stats:
 *   get:
 *     summary: Chiffres Mode Standard d'un enfant (vue parent)
 *     description: Réservé au compte parent (`learner`) de ce sous-compte. Même pattern que /languages/children/... .
 *     tags: [Standard]
 *     parameters:
 *       - in: path
 *         name: childId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Statistiques de l'enfant pour cette langue
 *       403:
 *         description: Réservé aux comptes parent (learner)
 *       404:
 *         description: Compte enfant introuvable (ou n'appartenant pas à ce parent), ou langue inconnue
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 */
router.get('/children/:childId/languages/:languageId/stats', allowRoles('learner'), controller.getChildLanguageStats);

// ==================== ADMINISTRATION ====================

/**
 * @swagger
 * /api/v1/standard/admin/languages/{languageId}/sessions:
 *   get:
 *     summary: Liste des sessions d'une langue, publiées ou non (admin/plateform_manager uniquement)
 *     tags: [Standard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sessions de la langue, dans l'ordre
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 */
router.get('/admin/languages/:languageId/sessions', adminOnly, controller.listSessionsForAdmin);

/**
 * @swagger
 * /api/v1/standard/admin/sessions:
 *   post:
 *     summary: Créer une session avec tous ses éléments (admin/plateform_manager uniquement)
 *     description: |
 *       Validation stricte à l'enregistrement (voir schéma StandardItem) : answerIndex
 *       hors limites, moins de 3 options, answerWords/term/translation manquants → refusés.
 *       La session est créée non publiée (isPublished=false) ; voir PATCH .../publish.
 *     tags: [Standard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [languageId, position, title, items]
 *             properties:
 *               languageId:       { type: string }
 *               position:         { type: integer, example: 1 }
 *               title:            { type: string, example: "Saluer au fil de la journée" }
 *               estimatedMinutes: { type: integer, default: 3 }
 *               items:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/StandardItem' }
 *     responses:
 *       201:
 *         description: Session créée
 *       400:
 *         description: Données invalides (règle par type non respectée, ou position déjà prise)
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 */
router.post('/admin/sessions', adminOnly, controller.createSession);

/**
 * @swagger
 * /api/v1/standard/admin/sessions/{id}:
 *   put:
 *     summary: Modifier une session et ses éléments (admin/plateform_manager uniquement)
 *     description: |
 *       Si `items` est fourni, remplace entièrement les éléments existants et
 *       repasse la session en non-publiée (reviewedBy/reviewedAt effacés) —
 *       toute modification du contenu annule la relecture précédente.
 *     tags: [Standard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session modifiée
 *       400:
 *         description: Données invalides
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 *       404:
 *         description: Session introuvable
 */
router.put('/admin/sessions/:id', adminOnly, controller.updateSession);

/**
 * @swagger
 * /api/v1/standard/admin/sessions/{id}/publish:
 *   patch:
 *     summary: Publier ou retirer une session (admin/plateform_manager uniquement)
 *     description: |
 *       Publier exige `reviewedBy` rempli (nom du locuteur natif ayant relu le
 *       contenu) si la session n'a jamais été relue — pose aussi reviewedAt.
 *       Retirer (isPublished=false) ne touche pas à reviewedBy/reviewedAt.
 *     tags: [Standard]
 *     security:
 *       - bearerAuth: []
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
 *             required: [isPublished]
 *             properties:
 *               isPublished: { type: boolean }
 *               reviewedBy:  { type: string, description: "Requis pour une première publication" }
 *     responses:
 *       200:
 *         description: Statut de publication mis à jour
 *       400:
 *         description: reviewedBy manquant pour une première publication
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 *       404:
 *         description: Session introuvable
 */
router.patch('/admin/sessions/:id/publish', adminOnly, controller.publishSession);

/**
 * @swagger
 * /api/v1/standard/admin/languages/{languageId}/order:
 *   put:
 *     summary: Réordonner les sessions d'une langue (admin/plateform_manager uniquement)
 *     tags: [Standard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order]
 *             properties:
 *               order:
 *                 type: array
 *                 items: { type: string }
 *                 description: Ids de toutes les sessions de cette langue, dans le nouvel ordre souhaité
 *     responses:
 *       200:
 *         description: Sessions réordonnées
 *       400:
 *         description: order ne correspond pas exactement aux sessions existantes de cette langue
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 */
router.put('/admin/languages/:languageId/order', adminOnly, controller.reorderSessions);

/**
 * @swagger
 * /api/v1/standard/admin/items/{id}/audio:
 *   post:
 *     summary: Envoyer l'enregistrement audio d'une carte (admin/plateform_manager uniquement)
 *     description: Stocke le fichier (MP3/WAV) et renseigne audioUrl sur l'item.
 *     tags: [Standard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: audioUrl mis à jour
 *       400:
 *         description: Aucun fichier audio reçu
 *       403:
 *         description: Réservé à l'admin/plateform_manager
 *       404:
 *         description: Item introuvable
 */
router.post('/admin/items/:id/audio', adminOnly, uploadCourseContent.single('audio'), controller.setItemAudio);

module.exports = router;
