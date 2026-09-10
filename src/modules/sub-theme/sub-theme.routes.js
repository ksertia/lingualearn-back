const express = require('express');
const controller = require('./sub-theme.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SubTheme
 *   description: |
 *     Gestion des sous-thèmes. Un sous-thème regroupe plusieurs **contenus** (cours, vidéo,
 *     exercice, ressource) en parallèle, plus au maximum une **évaluation**.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SubTheme:
 *       type: object
 *       properties:
 *         id:          { type: string }
 *         themeId:     { type: string }
 *         title:       { type: string }
 *         description: { type: string, nullable: true }
 *         index:       { type: integer }
 *         isActive:    { type: boolean }
 *         isDemo:      { type: boolean, description: "Sous-thème vitrine exposé publiquement via /discover/languages/{code}/demo. Un seul par langue — en marquer un second démarque automatiquement l'ancien." }
 *
 *     SubThemeCreate:
 *       type: object
 *       required: [themeId, title]
 *       properties:
 *         themeId:     { type: string }
 *         title:       { type: string, maxLength: 200 }
 *         description: { type: string, nullable: true }
 */

/**
 * @swagger
 * /api/v1/sub-themes:
 *   get:
 *     summary: Liste paginée des sous-thèmes
 *     tags: [SubTheme]
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
 *         name: themeId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste paginée
 */
router.get('/', controller.getSubThemes);

/**
 * @swagger
 * /api/v1/sub-themes/theme/{themeId}:
 *   get:
 *     summary: Sous-thèmes d'un thème
 *     description: Si userId est fourni, chaque sous-thème est enrichi avec sa progression (state, progressPercentage) pour cet utilisateur.
 *     tags: [SubTheme]
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Optionnel — enrichit la réponse avec la progression de cet utilisateur
 *     responses:
 *       200:
 *         description: Liste des sous-thèmes du thème
 */
router.get('/theme/:themeId', controller.getSubThemesByThemeId);

/**
 * @swagger
 * /api/v1/sub-themes/{id}:
 *   get:
 *     summary: Récupérer un sous-thème par ID (avec ses contenus et son évaluation)
 *     tags: [SubTheme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sous-thème trouvé
 */
router.get('/:id', controller.getSubTheme);

/**
 * @swagger
 * /api/v1/sub-themes:
 *   post:
 *     summary: Créer un sous-thème
 *     tags: [SubTheme]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SubThemeCreate' }
 *     responses:
 *       201:
 *         description: Sous-thème créé
 */
router.post('/', controller.createSubTheme);

/**
 * @swagger
 * /api/v1/sub-themes/{id}:
 *   patch:
 *     summary: Modifier un sous-thème
 *     description: |
 *       Passer isDemo=true marque ce sous-thème comme vitrine publique pour sa langue
 *       (exposé via /discover/languages/{code}/demo) et démarque automatiquement tout
 *       autre sous-thème démo de la même langue — un seul actif à la fois.
 *     tags: [SubTheme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:       { type: string }
 *               description: { type: string, nullable: true }
 *               index:       { type: integer }
 *               isActive:    { type: boolean }
 *               isDemo:      { type: boolean }
 *     responses:
 *       200:
 *         description: Sous-thème mis à jour
 */
router.patch('/:id', controller.updateSubTheme);

/**
 * @swagger
 * /api/v1/sub-themes/{id}:
 *   delete:
 *     summary: Supprimer un sous-thème (et tous ses contenus/évaluation)
 *     tags: [SubTheme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Sous-thème supprimé
 */
router.delete('/:id', controller.deleteSubTheme);

/**
 * @swagger
 * /api/v1/users/{userId}/sub-themes/{subThemeId}/start:
 *   post:
 *     summary: Démarrer un sous-thème pour un utilisateur
 *     description: |
 *       Pose startedAt / lastAccessedAt sur UserSubThemeProgress sans modifier le
 *       pourcentage, puis recalcule la progression du thème parent. Idempotent.
 *       Route montée dans src/routes/index.js (auth + abonnement requis).
 *     tags: [SubTheme]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: subThemeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progression du sous-thème (state, progressPercentage, startedAt...)
 *       404:
 *         description: Sous-thème non trouvé
 */

/**
 * @swagger
 * /api/v1/users/{userId}/sub-themes/{subThemeId}/complete:
 *   post:
 *     summary: Marquer un sous-thème comme complété pour un utilisateur
 *     description: |
 *       Force progressPercentage à 100 et completedAt sur UserSubThemeProgress,
 *       puis propage le recalcul au thème, au module et au niveau.
 *       Route montée dans src/routes/index.js.
 *     tags: [SubTheme]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: subThemeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progression du sous-thème mise à jour, chaîne recalculée
 *       404:
 *         description: Sous-thème non trouvé
 */

module.exports = router;
