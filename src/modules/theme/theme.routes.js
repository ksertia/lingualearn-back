const express = require('express');
const controller = require('./theme.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Theme
 *   description: Gestion des thèmes (regroupement de sous-thèmes au sein d'un Module)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Theme:
 *       type: object
 *       properties:
 *         id:          { type: string }
 *         moduleId:    { type: string }
 *         title:       { type: string }
 *         description: { type: string, nullable: true }
 *         iconUrl:     { type: string, nullable: true }
 *         index:       { type: integer }
 *         isActive:    { type: boolean }
 *
 *     ThemeCreate:
 *       type: object
 *       required: [moduleId, title]
 *       properties:
 *         moduleId:    { type: string }
 *         title:       { type: string, maxLength: 200 }
 *         description: { type: string, nullable: true }
 *         iconUrl:     { type: string, nullable: true }
 */

/**
 * @swagger
 * /api/v1/themes:
 *   get:
 *     summary: Liste paginée des thèmes
 *     tags: [Theme]
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
 *         name: moduleId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Liste paginée
 */
router.get('/', controller.getThemes);

/**
 * @swagger
 * /api/v1/themes/module/{moduleId}:
 *   get:
 *     summary: Thèmes d'un module
 *     description: |
 *       Si userId est fourni, chaque thème est enrichi avec une progression (state,
 *       progressPercentage) calculée à la volée — moyenne des sous-thèmes de ce thème
 *       pour cet utilisateur. Pas de table dédiée, même principe que Module/Level.
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *         description: Optionnel — enrichit la réponse avec la progression de cet utilisateur
 *     responses:
 *       200:
 *         description: Liste des thèmes du module
 */
router.get('/module/:moduleId', controller.getThemesByModuleId);

/**
 * @swagger
 * /api/v1/themes/{id}:
 *   get:
 *     summary: Récupérer un thème par ID (avec ses sous-thèmes)
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Thème trouvé
 */
router.get('/:id', controller.getTheme);

/**
 * @swagger
 * /api/v1/themes:
 *   post:
 *     summary: Créer un thème
 *     tags: [Theme]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ThemeCreate' }
 *     responses:
 *       201:
 *         description: Thème créé
 */
router.post('/', controller.createTheme);

/**
 * @swagger
 * /api/v1/themes/{id}:
 *   patch:
 *     summary: Modifier un thème
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Thème mis à jour
 */
router.patch('/:id', controller.updateTheme);

/**
 * @swagger
 * /api/v1/themes/{id}:
 *   delete:
 *     summary: Supprimer un thème (et tous ses sous-thèmes)
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Thème supprimé
 */
router.delete('/:id', controller.deleteTheme);

/**
 * @swagger
 * /api/v1/users/{userId}/themes/{themeId}/start:
 *   post:
 *     summary: Démarrer un thème pour un utilisateur
 *     description: |
 *       Pose startedAt / lastAccessedAt sur UserThemeProgress sans modifier le
 *       pourcentage. Idempotent — un second appel ne réinitialise pas startedAt.
 *       Route montée dans src/routes/index.js (auth + abonnement requis).
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progression du thème (state, progressPercentage, startedAt...)
 *       404:
 *         description: Thème non trouvé
 */

/**
 * @swagger
 * /api/v1/users/{userId}/themes/{themeId}/complete:
 *   post:
 *     summary: Marquer un thème comme complété pour un utilisateur
 *     description: |
 *       Force progressPercentage à 100 et completedAt sur UserThemeProgress.
 *       Ne propage pas vers les sous-thèmes ni vers le module (le module reste
 *       calculé à partir des sous-thèmes réels). Route montée dans src/routes/index.js.
 *     tags: [Theme]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progression du thème mise à jour
 *       404:
 *         description: Thème non trouvé
 */

module.exports = router;
