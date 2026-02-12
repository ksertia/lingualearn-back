const express = require('express');
const controller = require('./Level.controller');
const router = express.Router();
const { authMiddleware, allowRoles } = require('../../middleware/authMiddleware');

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
 *               - languageId
 *               - code
 *               - name
 *             properties:
 *               languageId:
 *                 type: string
 *                 description: ID de la langue parente
 *               code:
 *                 type: string
 *                 maxLength: 20
 *                 example: beginner
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: Débutant
 *               description:
 *                 type: string
 *                 example: Niveau pour les débutants
 *               index:
 *                 type: integer
 *                 minimum: 0
 *                 description: Ordre d'affichage (auto si non fourni)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Niveau créé
 *       400:
 *         description: Données invalides
 */
router.post('/', authMiddleware, allowRoles('admin', 'plateform_manager'), controller.create);

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
router.put('/:id', authMiddleware, allowRoles('admin', 'plateform_manager'), controller.update);

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
router.delete('/:id', authMiddleware, allowRoles('admin', 'plateform_manager'), controller.remove);

/**
 * @swagger
 * /api/v1/users/{userId}/levels:
 *   get:
 *     summary: Récupérer les niveaux liés à un utilisateur
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des niveaux liés à l'utilisateur
 *       404:
 *         description: Aucun niveau trouvé pour cet utilisateur
 */
router.get('/api/v1/users/:userId/levels', controller.getByUserId);

/**
 * @swagger
 * /api/v1/users/{userId}/levels/{levelId}/select:
 *   post:
 *     summary: Sélectionner un niveau pour un utilisateur
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du niveau
 *     responses:
 *       201:
 *         description: Niveau sélectionné avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       404:
 *         description: Niveau non trouvé
 */
router.post('/api/v1/users/:userId/levels/:levelId/select', controller.selectLevel);

/**
 * @swagger
 * /api/v1/users/{userId}/levels/{levelId}/start:
 *   post:
 *     summary: Démarrer un niveau pour un utilisateur
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/levels/:levelId/start', controller.startLevel);

/**
 * @swagger
 * /api/v1/users/{userId}/levels/{levelId}/complete:
 *   post:
 *     summary: Valider un niveau pour un utilisateur
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/levels/:levelId/complete', controller.completeLevel);

/**
 * @swagger
 * /api/v1/levels/{id}/activate:
 *   patch:
 *     summary: Activer un niveau
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du niveau
 *     responses:
 *       200:
 *         description: Niveau activé avec succès
 *       404:
 *         description: Niveau non trouvé
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/activate',
  authMiddleware,
  allowRoles('admin', 'plateform_manager'),
  controller.activateLevel
);

/**
 * @swagger
 * /api/v1/levels/{id}/deactivate:
 *   patch:
 *     summary: Désactiver un niveau
 *     tags: [Levels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du niveau
 *     responses:
 *       200:
 *         description: Niveau désactivé avec succès
 *       404:
 *         description: Niveau non trouvé
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/:id/deactivate',
  authMiddleware,
  allowRoles('admin', 'plateform_manager'),
  controller.deactivateLevel
);

module.exports = router;