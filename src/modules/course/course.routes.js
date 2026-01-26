const express = require('express');
const controller = require('./course.controller');
const router = express.Router();

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Créer un nouveau cours
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *               trackId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cours créé avec succès
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.createCourse);

module.exports = router;
