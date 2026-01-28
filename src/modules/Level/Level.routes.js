const express = require('express');
const controller = require('./Level.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Levels
 *   description: Gestion des niveaux (Level)
 */

/**
 * @swagger
 * /api/v1/levels:
 *   post:
 *     summary: Créer un nouveau niveau
 *     tags: [Levels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - learningPathId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               learningPathId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Niveau créé
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/levels:
 *   get:
 *     summary: Récupérer tous les niveaux
 *     tags: [Levels]
 *     responses:
 *       200:
 *         description: Liste des niveaux
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/v1/levels/{id}:
 *   get:
 *     summary: Récupérer un niveau par ID
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Niveau trouvé
 *       404:
 *         description: Niveau non trouvé
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/levels/{id}:
 *   put:
 *     summary: Mettre à jour un niveau
 *     tags: [Levels]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Niveau mis à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Niveau non trouvé
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/v1/levels/{id}:
 *   delete:
 *     summary: Supprimer un niveau
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Niveau supprimé
 *       404:
 *         description: Niveau non trouvé
 */
router.delete('/:id', controller.remove);

module.exports = router;