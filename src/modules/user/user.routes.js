const express = require('express');
const { userController } = require('./user.controller');
const { authMiddleware, allowRoles } = require('../../middleware/authMiddleware');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get current user
 *     description: Get the authenticated user's information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', userController.getCurrentUser);

/**
 * @swagger
 * /api/v1/users/my-children:
 *   get:
 *     tags: [Users]
 *     summary: Get my child accounts (parent only)
 *     description: Returns all sub_account_learner accounts created by the authenticated learner.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of child accounts
 *       403:
 *         description: Not a learner account
 */
router.get('/my-children', allowRoles('learner'), userController.getMyChildren);

/**
 * @swagger
 * /api/v1/users/my-progress:
 *   get:
 *     summary: Progression actuelle de l'enfant connecté
 *     description: Retourne la langue/niveau/module/parcours/étape en cours + taux de finition. Accessible au parent et à l'enfant.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progression actuelle retournée
 *       403:
 *         description: Réservé aux comptes enfants
 */
router.get('/my-progress', userController.getMyProgress);

/**
 * @swagger
 * /api/v1/users/me:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update current user
 *     description: Update the authenticated user's information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User successfully updated
 *       401:
 *         description: Unauthorized
 */
router.put('/me', userController.updateUser);


/**
 * @swagger
 * /api/v1/users/profile-filters:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get users by profile filters
 *     description: Retrieve users using advanced profile filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by language
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: Filter by language level (A1, A2, B1, B2, C1, C2)
 *       - in: query
 *         name: accountType
 *         schema:
 *           type: string
 *         description: Filter by account type
 *       - in: query
 *         name: minAge
 *         schema:
 *           type: integer
 *         description: Minimum age
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: integer
 *         description: Maximum age
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by username or email
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile-filters', userController.getUsersByProfileFilters);

/**
 * @swagger
 * /api/v1/users/me:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete current user
 *     description: Delete the authenticated user's account
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User successfully deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/me', userController.deleteUser);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     description: Get a list of all users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/', allowRoles('admin', 'plateform_manager'), userController.getAllUsers);

/**
 * @swagger
 * /api/v1/users/stats:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user statistics
 *     description: Get user statistics (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/stats', allowRoles('admin'), userController.getStats);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Get a specific user's information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/:id', userController.getUserById);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user by ID
 *     description: Update a specific user's information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User successfully updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/:id', userController.updateUser);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user by ID
 *     description: Delete a specific user's account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User successfully deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;