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
 *     tags: [SubTheme]
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema: { type: string }
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
 *     tags: [SubTheme]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
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

module.exports = router;
