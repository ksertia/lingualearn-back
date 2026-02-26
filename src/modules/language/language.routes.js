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
 * /api/v1/languages/{languageId}/levels:
 *   get:
 *     summary: Récupérer tous les niveaux d'une langue
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID de la langue (UUID Prisma)"
 *     responses:
 *       200:
 *         description: Niveaux récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     languageId:
 *                       type: string
 *                     levels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           index:
 *                             type: integer
 *                           modules:
 *                             type: array
 *                             items:
 *                               type: object
 *       404:
 *         description: Langue non trouvée
 */
router.get('/:languageId/levels', controller.getLanguageLevels);

/**
 * @swagger
 * /api/v1/languages/{languageId}/levels/{levelId}/modules:
 *   get:
 *     summary: Récupérer tous les modules d'un niveau spécifique d'une langue
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID de la langue (UUID Prisma)"
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du niveau
 *     responses:
 *       200:
 *         description: Modules récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     languageId:
 *                       type: string
 *                     levelId:
 *                       type: string
 *                     levelName:
 *                       type: string
 *                     modules:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           index:
 *                             type: integer
 *                           paths:
 *                             type: array
 *                             items:
 *                               type: object
 *       404:
 *         description: Langue ou niveau non trouvé
 */
router.get('/:languageId/levels/:levelId/modules', controller.getLevelModules);

/**
 * @swagger
 * /api/v1/languages/{languageId}/levels/{levelId}/modules/{moduleId}/paths:
 *   get:
 *     summary: Récupérer tous les parcours d'un module spécifique
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID de la langue (UUID Prisma)"
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du niveau
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du module
 *     responses:
 *       200:
 *         description: Parcours récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     languageId:
 *                       type: string
 *                     levelId:
 *                       type: string
 *                     moduleId:
 *                       type: string
 *                     moduleName:
 *                       type: string
 *                     paths:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           index:
 *                             type: integer
 *                           steps:
 *                             type: array
 *                             items:
 *                               type: object
 *       404:
 *         description: Langue, niveau ou module non trouvé
 */
router.get('/:languageId/levels/:levelId/modules/:moduleId/paths', controller.getModulePaths);

/**
 * @swagger
 * /api/v1/languages/{languageId}/levels/{levelId}/modules/{moduleId}/paths/{pathId}/steps:
 *   get:
 *     summary: Récupérer toutes les étapes d'un parcours spécifique
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID de la langue (UUID Prisma)"
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du niveau
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du module
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du parcours
 *     responses:
 *       200:
 *         description: Étapes récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     languageId:
 *                       type: string
 *                     levelId:
 *                       type: string
 *                     moduleId:
 *                       type: string
 *                     pathId:
 *                       type: string
 *                     pathName:
 *                       type: string
 *                     steps:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           index:
 *                             type: integer
 *                           type:
 *                             type: string
 *                           content:
 *                             type: object
 *       404:
 *         description: Langue, niveau, module ou parcours non trouvé
 */
router.get('/:languageId/levels/:levelId/modules/:moduleId/paths/:pathId/steps', controller.getPathSteps);

/**
 * @swagger
 * /api/v1/languages/{languageId}/levels/{levelId}/modules/{moduleId}/paths/{pathId}/steps/{stepId}/content:
 *   get:
 *     summary: Récupérer le contenu complet d'une étape (cours, exercices, quiz)
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID de la langue (UUID Prisma)"
 *       - in: path
 *         name: levelId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du niveau
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du module
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du parcours
 *       - in: path
 *         name: stepId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'étape
 *     responses:
 *       200:
 *         description: Contenu de l'étape récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     languageId:
 *                       type: string
 *                     levelId:
 *                       type: string
 *                     moduleId:
 *                       type: string
 *                     pathId:
 *                       type: string
 *                     stepId:
 *                       type: string
 *                     stepName:
 *                       type: string
 *                     step:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         index:
 *                           type: integer
 *                         type:
 *                           type: string
 *                     courses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           content:
 *                             type: object
 *                           order:
 *                             type: integer
 *                     exercises:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           instructions:
 *                             type: string
 *                           type:
 *                             type: string
 *                           order:
 *                             type: integer
 *                     quizzes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           questions:
 *                             type: array
 *                           order:
 *                             type: integer
 *       404:
 *         description: Langue, niveau, module, parcours ou étape non trouvé
 */
router.get('/:languageId/levels/:levelId/modules/:moduleId/paths/:pathId/steps/:stepId/content', controller.getStepContent);

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
 * /api/v1/languages/active:
 *   get:
 *     summary: Récupérer toutes les langues actives
 *     tags: [Languages]
 *     responses:
 *       200:
 *         description: Liste des langues actives
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       levels:
 *                         type: array
 */
router.get('/active', controller.getActiveLanguages);

/**
 * @swagger
 * /api/v1/languages/{id}/activate:
 *   patch:
 *     summary: Activer une langue
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       200:
 *         description: Langue activée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Langue non trouvée
 */
router.patch('/:id/activate', authMiddleware, allowRoles('admin', 'plateform_manager'), controller.activateLanguage);

/**
 * @swagger
 * /api/v1/languages/{id}/deactivate:
 *   patch:
 *     summary: Désactiver une langue
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       200:
 *         description: Langue désactivée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Langue non trouvée
 */
router.patch('/:id/deactivate', authMiddleware, allowRoles('admin', 'plateform_manager'), controller.deactivateLanguage);

/**
 * @swagger
 * /api/v1/languages/{id}/available-levels:
 *   get:
 *     summary: Récupérer les niveaux disponibles pour une langue
 *     tags: [Languages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       200:
 *         description: Niveaux disponibles récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     language:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         code:
 *                           type: string
 *                         name:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *                     levels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           code:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           _count:
 *                             type: object
 *                             properties:
 *                               modules:
 *                                 type: integer
 *       404:
 *         description: Langue non trouvée
 */
router.get('/:id/available-levels', controller.getAvailableLevels);

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
 *         description: ID de l'utilisateur
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la langue
 *     responses:
 *       201:
 *         description: Langue sélectionnée avec succès
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
 *         description: Langue non trouvée
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

