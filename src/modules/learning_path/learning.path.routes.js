const express = require('express');
const controller = require('./learning.path.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Paths
 *   description: Gestion des parcours (Path)
 */

/**
 * @swagger
 * /api/v1/learning-paths:
 *   post:
 *     summary: Créer un nouveau parcours
 *     tags: [Paths]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - moduleId
 *               - title
 *             properties:
 *               moduleId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               index:
 *                 type: integer
 *                 nullable: true
 *                 description: "Index du parcours (null, non fourni ou nombre pour auto-incrémentation - premier = 0)"
 *               tempResaListime:
 *                 type: integer
 *               thumbnailUrl:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               estimatedHours:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Parcours créé
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/learning-paths:
 *   get:
 *     summary: Récupérer tous les parcours
 *     tags: [Paths]
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
 *     tags: [Paths]
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
 * /api/v1/learning-paths/{id}:
 *   put:
 *     summary: Mettre à jour un parcours
 *     tags: [Paths]
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
 *               moduleId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               index:
 *                 type: integer
 *                 nullable: true
 *                 description: "Index du parcours (null, non fourni ou nombre pour auto-incrémentation - premier = 0)"
 *               tempResaListime:
 *                 type: integer
 *               thumbnailUrl:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               estimatedHours:
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
 * /api/v1/learning-paths/{id}:
 *   delete:
 *     summary: Supprimer un parcours
 *     tags: [Paths]
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

/**
 * @swagger
 * /api/v1/users/{userId}/paths:
 *   get:
 *     summary: Récupérer les parcours liés à un utilisateur
 *     tags: [Paths]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des parcours liés à l'utilisateur
 *       404:
 *         description: Aucun parcours trouvé pour cet utilisateur
 */
router.get('/api/v1/users/:userId/paths', controller.getByUserId);


/**
 * @swagger
 * /api/v1/users/{userId}/paths/{pathId}/start:
 *   post:
 *     summary: Démarrer un parcours pour un utilisateur
 *     tags: [Paths]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/paths/:pathId/start', controller.startPath);

/**
 * @swagger
 * /api/v1/users/{userId}/paths/{pathId}/complete:
 *   post:
 *     summary: Valider un parcours pour un utilisateur
 *     tags: [Paths]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/paths/:pathId/complete', controller.completePath);

module.exports = router;
