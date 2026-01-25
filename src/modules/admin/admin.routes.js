const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { validateRequest } = require('./admin.schema');

// Import middleware auth (à décommenter une fois prêt)
// const { authMiddleware, allowRoles } = require('../../middleware/authMiddleware');

// Toutes les routes admin nécessitent l'authentification et le rôle admin
// TEMPORAIREMENT DÉSACTIVÉ POUR TESTER
// router.use(authMiddleware);
// router.use(allowRoles('admin', 'super_admin'));

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/dashboard', adminController.getDashboard);

// ============================================================================
// COURSE MANAGEMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/courses:
 *   get:
 *     summary: Get all courses with filters and pagination
 *     tags: [Admin - Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, description, courseCode
 *       - in: query
 *         name: trackId
 *         schema:
 *           type: string
 *         description: Filter by track ID
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *         description: Filter by published status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
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
 *                 pagination:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get('/courses', adminController.getCourses);

/**
 * @swagger
 * /api/v1/admin/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Admin - Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *       404:
 *         description: Course not found
 */
router.get('/courses/:id', adminController.getCourse);

/**
 * @swagger
 * /api/v1/admin/courses:
 *   post:
 *     summary: Create new course
 *     tags: [Admin - Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - trackId
 *               - courseNumber
 *               - title
 *             properties:
 *               trackId:
 *                 type: string
 *                 description: Track ID
 *               courseNumber:
 *                 type: integer
 *                 description: Course number in track
 *               title:
 *                 type: string
 *                 description: Course title
 *               description:
 *                 type: string
 *                 description: Course description
 *               thumbnailUrl:
 *                 type: string
 *                 description: Course thumbnail URL
 *               videoPreviewUrl:
 *                 type: string
 *                 description: Video preview URL
 *               estimatedDurationMinutes:
 *                 type: integer
 *                 description: Estimated duration in minutes
 *               difficultyLevel:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *                 description: Difficulty level
 *               isPublished:
 *                 type: boolean
 *                 description: Published status
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Bad request
 */
router.post('/courses', validateRequest('createCourse'), adminController.createCourse);

/**
 * @swagger
 * /api/v1/admin/courses/{id}:
 *   put:
 *     summary: Update course
 *     tags: [Admin - Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
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
 *               thumbnailUrl:
 *                 type: string
 *               videoPreviewUrl:
 *                 type: string
 *               estimatedDurationMinutes:
 *                 type: integer
 *               difficultyLevel:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Course updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Course not found
 */
router.put('/courses/:id', validateRequest('updateCourse'), adminController.updateCourse);

/**
 * @swagger
 * /api/v1/admin/courses/{id}:
 *   delete:
 *     summary: Delete course
 *     tags: [Admin - Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *       400:
 *         description: Cannot delete - course has users
 *       404:
 *         description: Course not found
 */
router.delete('/courses/:id', adminController.deleteCourse);

/**
 * @swagger
 * /api/v1/admin/courses/{id}/duplicate:
 *   post:
 *     summary: Duplicate course with all lessons and exercises
 *     tags: [Admin - Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID to duplicate
 *     responses:
 *       201:
 *         description: Course duplicated successfully
 *       404:
 *         description: Course not found
 */
router.post('/courses/:id/duplicate', adminController.duplicateCourse);

/**
 * @swagger
 * /api/v1/admin/courses/{id}/toggle-publish:
 *   patch:
 *     summary: Toggle course publish status
 *     tags: [Admin - Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course publish status toggled successfully
 *       404:
 *         description: Course not found
 */
router.patch('/courses/:id/toggle-publish', adminController.toggleCoursePublish);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users with filters and pagination
 *     tags: [Admin - Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in email, username, phone, name
 *       - in: query
 *         name: accountType
 *         schema:
 *           type: string
 *           enum: [admin, user, sub_account]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users', adminController.getUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user by ID with full details
 *     tags: [Admin - Users]
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
 *       404:
 *         description: User not found
 */
router.get('/users/:id', adminController.getUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/stats:
 *   get:
 *     summary: Get user statistics and activity
 *     tags: [Admin - Users]
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
 *         description: User stats retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/users/:id/stats', adminController.getUserStats);

/**
 * @swagger
 * /api/v1/admin/users/{id}/reset-password:
 *   post:
 *     summary: Reset user password (admin action)
 *     tags: [Admin - Users]
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
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (min 8 characters)
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: User not found
 */
router.post('/users/:id/reset-password', validateRequest('resetPassword'), adminController.resetUserPassword);

/**
 * @swagger
 * /api/v1/admin/users/{id}/toggle-active:
 *   patch:
 *     summary: Toggle user active status
 *     tags: [Admin - Users]
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
 *         description: User status toggled successfully
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/toggle-active', adminController.toggleUserActive);

/**
 * @swagger
 * /api/v1/admin/users/{id}/verify:
 *   patch:
 *     summary: Manually verify user account
 *     tags: [Admin - Users]
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
 *         description: User verified successfully
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/verify', adminController.verifyUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Delete user account
 *     tags: [Admin - Users]
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
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete admin users
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;