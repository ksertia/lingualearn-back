const express = require('express');
const controller = require('./language.controller');
const router = express.Router();
const { authMiddleware, allowRoles } = require('../../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Languages
 *   description: Gestion des langues
 */

/**
 * @swagger
 * /api/v1/languages:
 *   post:
 *     summary: Créer une nouvelle langue
 *     tags: [Languages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *             properties:
 *               code:
 *                 type: string
 *                 example: fr
 *               name:
 *                 type: string
 *                 example: Français
 *               description:
 *                 type: string
 *                 example: Langue française
 *               iconUrl:
 *                 type: string
 *                 example: https://cdn.lingualearn.com/icons/fr.png
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Langue créée
 *       400:
 *         description: Données invalides
 */
router.post('/', authMiddleware, allowRoles('admin', 'plateform_manager'), controller.create);

/**
 * @swagger
 * /api/v1/languages:
 *   get:
 *     summary: Lister toutes les langues
 *     tags: [Languages]
 *     responses:
 *       200:
 *         description: Liste des langues
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/v1/languages/{id}:
 *   get:
 *     summary: Obtenir une langue par ID
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Langue trouvée
 *       404:
 *         description: Langue non trouvée
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/v1/languages/{id}:
 *   put:
 *     summary: Modifier une langue
 *     tags: [Languages]
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
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Langue modifiée
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Langue non trouvée
 */
router.put('/:id', authMiddleware, allowRoles('admin', 'plateform_manager'), controller.update);

/**
 * @swagger
 * /api/v1/languages/{id}:
 *   delete:
 *     summary: Supprimer une langue
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Langue supprimée
 *       404:
 *         description: Langue non trouvée
 */
router.delete('/:id', authMiddleware, allowRoles('admin', 'plateform_manager'), controller.remove);

/**
 * @swagger
 * /api/v1/users/{userId}/languages:
 *   get:
 *     summary: Récupérer les langues liées à un utilisateur
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des langues liées à l'utilisateur
 *       404:
 *         description: Aucune langue trouvée pour cet utilisateur
 */
router.get('/api/v1/users/:userId/languages', controller.getByUserId);


/**
 * @swagger
 * /api/v1/users/{userId}/languages/{languageId}/select:
 *   post:
 *     summary: Sélectionner une langue pour un utilisateur
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Progression créée ou existante
 */
router.post('/api/v1/users/:userId/languages/:languageId/select', controller.selectLanguage);

/**
 * @swagger
 * /api/v1/users/{userId}/languages/{languageId}/start:
 *   post:
 *     summary: Démarrer une langue pour un utilisateur
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/languages/:languageId/start', controller.startLanguage);

/**
 * @swagger
 * /api/v1/users/{userId}/languages/{languageId}/complete:
 *   post:
 *     summary: Valider une langue pour un utilisateur
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progression mise à jour
 */
router.post('/api/v1/users/:userId/languages/:languageId/complete', controller.completeLanguage);

module.exports = router;

