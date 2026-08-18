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

module.exports = router;
