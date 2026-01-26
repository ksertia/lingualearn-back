const express = require('express');
const controller = require('./learning.path.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: LearningPaths
 *   description: Gestion des parcours (LearningPath)
 */

/**
 * @swagger
 * /api/v1/learning-paths:
 *   post:
 *     summary: Créer un nouveau parcours
 *     tags: [LearningPaths]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Parcours créé
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /learning-paths:
 *   get:
 *     summary: Récupérer tous les parcours
 *     tags: [LearningPaths]
 *     responses:
 *       200:
 *         description: Liste des parcours
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/v1/learning-paths/{id}:
 *   get:
 *     summary: Récupérer un parcours par ID
 *     tags: [LearningPaths]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Parcours trouvé
 *       404:
 *         description: Parcours non trouvé
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /learning-paths/{id}:
 *   put:
 *     summary: Mettre à jour un parcours
 *     tags: [LearningPaths]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               code:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
 *               bannerUrl:
 *                 type: string
 *               colorCode:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *               estimatedDurationWeeks:
 *                 type: integer
 *               isPublished:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Parcours mis à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Parcours non trouvé
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /learning-paths/{id}:
 *   delete:
 *     summary: Supprimer un parcours
 *     tags: [LearningPaths]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Parcours supprimé
 *       404:
 *         description: Parcours non trouvé
 */
router.delete('/:id', controller.remove);

module.exports = router;
