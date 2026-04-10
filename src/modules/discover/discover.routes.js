const express = require('express');
const router = express.Router();
const ctrl = require('./discover.controller');
const { asyncHandler } = require('../../middleware/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Discover
 *   description: Section découverte — gestion des sections et contenus par l'admin
 */

/**
 * @swagger
 * /api/v1/discover/languages:
 *   get:
 *     summary: Get all distinct languages from discover sections
 *     tags: [Discover]
 *     responses:
 *       200:
 *         description: List of unique languages
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
 *                     type: string
 *                   example: ["Français", "Wolof", "Arabe"]
 */
router.get('/languages', asyncHandler(ctrl.listLanguages));

/**
 * @swagger
 * /api/v1/discover/languages/{language}/lessons:
 *   get:
 *     summary: Get all lesson sections for a given language
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: language
 *         required: true
 *         schema:
 *           type: string
 *         example: "Wolof"
 *     responses:
 *       200:
 *         description: List of lesson sections
 */
router.get('/languages/:language/lessons', asyncHandler(ctrl.listLessons));

/**
 * @swagger
 * /api/v1/discover/languages/{language}/exercises:
 *   get:
 *     summary: Get all exercise sections for a given language
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: language
 *         required: true
 *         schema:
 *           type: string
 *         example: "Wolof"
 *     responses:
 *       200:
 *         description: List of exercise sections
 */
router.get('/languages/:language/exercises', asyncHandler(ctrl.listExercises));

// ── SECTIONS ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/discover/sections:
 *   get:
 *     summary: List all discover sections with their contents
 *     tags: [Discover]
 *     responses:
 *       200:
 *         description: List of sections
 */
router.get('/sections', asyncHandler(ctrl.listSections));

/**
 * @swagger
 * /api/v1/discover/sections/{id}:
 *   get:
 *     summary: Get a section with its contents
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Section detail
 *       404:
 *         description: Section not found
 */
router.get('/sections/:id', asyncHandler(ctrl.getSection));

/**
 * @swagger
 * /api/v1/discover/sections:
 *   post:
 *     summary: Create a discover section
 *     tags: [Discover]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, language]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Introduction au Wolof"
 *               type:
 *                 type: string
 *                 enum: [lesson, exercise]
 *               language:
 *                 type: string
 *                 example: "Wolof"
 *     responses:
 *       201:
 *         description: Section created
 */
router.post('/sections', asyncHandler(ctrl.createSection));

/**
 * @swagger
 * /api/v1/discover/sections/{id}:
 *   patch:
 *     summary: Update a discover section
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Section updated
 */
router.patch('/sections/:id', asyncHandler(ctrl.updateSection));

/**
 * @swagger
 * /api/v1/discover/sections/{id}:
 *   delete:
 *     summary: Delete a discover section
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Section deleted
 */
router.delete('/sections/:id', asyncHandler(ctrl.deleteSection));

// ── CONTENTS ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/discover/sections/{sectionId}/contents:
 *   post:
 *     summary: Add a content item to a section
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questionType, questionValue]
 *             properties:
 *               order:
 *                 type: integer
 *               questionType:
 *                 type: string
 *                 enum: [text, audio, image, video, file]
 *               questionValue:
 *                 type: string
 *               answerType:
 *                 type: string
 *                 enum: [text, audio, image, video, file]
 *               answerValue:
 *                 type: string
 *               options:
 *                 type: array
 *                 description: For exercise sections only
 *                 items:
 *                   type: object
 *                   required: [value, isCorrect]
 *                   properties:
 *                     value:
 *                       type: string
 *                     isCorrect:
 *                       type: boolean
 *                     order:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Content created
 */
router.post('/sections/:sectionId/contents', asyncHandler(ctrl.createContent));

/**
 * @swagger
 * /api/v1/discover/contents/{contentId}:
 *   patch:
 *     summary: Update a content item
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content updated
 */
router.patch('/contents/:contentId', asyncHandler(ctrl.updateContent));

/**
 * @swagger
 * /api/v1/discover/contents/{contentId}:
 *   delete:
 *     summary: Delete a content item
 *     tags: [Discover]
 *     parameters:
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content deleted
 */
router.delete('/contents/:contentId', asyncHandler(ctrl.deleteContent));

module.exports = router;
