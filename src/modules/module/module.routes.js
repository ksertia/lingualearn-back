const express = require('express');
const controller = require('./module.controller');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Modules
 *   description: Gestion des modules de niveau
 */

/**
 * @swagger
 * /api/v1/modules:
 *   post:
 *     summary: Créer un module
 *     tags: [Modules]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - levelId
 *               - title
 *             properties:
 *               levelId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *               index:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Module créé
 *       400:
 *         description: Données invalides
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/v1/modules:
 *   get:
 *     summary: Lister tous les modules
 *     tags: [Modules]
 *     responses:
 *       200:
 *         description: Liste des modules
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/v1/modules/{id}:
 *   get:
 *     summary: Obtenir un module par ID
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module trouvé
 *       404:
 *         description: Module non trouvé
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/modules/{id}:
 *   put:
 *     summary: Modifier un module
 *     tags: [Modules]
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
 *               iconUrl:
 *                 type: string
 *               index:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Module modifié
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Module non trouvé
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/v1/modules/{id}:
 *   delete:
 *     summary: Supprimer un module
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Module supprimé
 *       404:
 *         description: Module non trouvé
 */
router.delete('/:id', controller.remove);

/**
 * @swagger
 * /api/v1/users/{userId}/modules:
 *   get:
 *     summary: Récupérer les modules liés à un utilisateur
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des modules liés à l'utilisateur
 *       404:
 *         description: Aucun module trouvé pour cet utilisateur
 */
router.get('/api/v1/users/:userId/modules', controller.getByUserId);


/**
 * @swagger
 * /api/v1/users/{userId}/modules/{moduleId}/select:
 *   post:
 *     summary: Sélectionner un module pour un utilisateur
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Progression créée ou existante
 */
router.post('/api/v1/users/:userId/modules/:moduleId/select', controller.selectModule);

/**
 * @swagger
 * /api/v1/users/{userId}/modules/{moduleId}/start:
 *   post:
 *     summary: Démarrer un module pour un utilisateur
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/modules/:moduleId/start', controller.startModule);

/**
 * @swagger
 * /api/v1/users/{userId}/modules/{moduleId}/complete:
 *   post:
 *     summary: Valider un module pour un utilisateur
 *     tags: [Modules]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/modules/:moduleId/complete', controller.completeModule);

module.exports = router;
