const express = require('express');
const { authController } = require('./auth.controller');
const { authMiddleware } = require('../../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegistration:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         phone:
 *           type: string
 *           example: "+22670123456"
 *         password:
 *           type: string
 *           format: password
 *           example: password
 *         username:
 *           type: string
 *           example: null
 *           nullable: true
 *         accountType:
 *           type: string
 *           enum: [admin, parent, child, teacher]
 *           default: parent
 *         parentId:
 *           type: string
 *           example: null
 *           nullable: true
 *       required:
 *         - firstName
 *         - lastName
 *         - password
 *       oneOf:
 *         - required: [email]
 *         - required: [phone]
 *
 *     UserLogin:
 *       type: object
 *       properties:
 *         loginInfo:
 *           type: string
 *           example: "user@example.com"
 *           description: Can be email, username, or phone number
 *         password:
 *           type: string
 *           format: password
 *           example: password
 *       required:
 *         - loginInfo
 *         - password
 *
 *     ForgotPassword:
 *       type: object
 *       properties:
 *         loginInfo:
 *           type: string
 *           example: user@example.com
 *           description: Peut être email, username ou numéro de téléphone
 *       required:
 *         - loginInfo
 *
 *     ResetPassword:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: "a1b2c3d4e5f6g7h8i9j0"
 *         newPassword:
 *           type: string
 *           format: password
 *           example: password
 *       required:
 *         - token
 *         - newPassword
 *
 *     VerifyAccount:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: "123456"
 *       required:
 *         - token
 *
 *     ChangePassword:
 *       type: object
 *       properties:
 *         currentPassword:
 *           type: string
 *           format: password
 *           example: Oldpassword
 *         newPassword:
 *           type: string
 *           format: password
 *           example: Newpassword
 *       required:
 *         - currentPassword
 *         - newPassword
 *
 *     RefreshToken:
 *       type: object
 *       properties:
 *         refreshToken:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       required:
 *         - refreshToken
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: Create a new user account with email/phone and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegistration'
 *     responses:
 *       201:
 *         description: User successfully registered
 *       400:
 *         description: Bad request - invalid input
 *       409:
 *         description: Conflict - email or phone already exists
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Login user
 *     description: Authenticate user with loginInfo (email, username, or phone) and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized - invalid credentials
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Request password reset
 *     description: Send a password reset link to the user's email or phone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPassword'
 *     responses:
 *       200:
 *         description: Reset link sent to email/phone
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Reset password
 *     description: Reset user password with a valid reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *     responses:
 *       200:
 *         description: Password successfully reset
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/v1/auth/verify-account:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify user account
 *     description: Verify user account with verification token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyAccount'
 *     responses:
 *       200:
 *         description: Account successfully verified
 *       400:
 *         description: Invalid verification token
 */
router.post('/verify-account', authController.verifyAccount);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     tags: [Authentication]
 *     summary: Refresh access token
 *     description: Get a new access token using a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshToken'
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Logout user
 *     description: Invalidate user session and tokens
 *     responses:
 *       200:
 *         description: User successfully logged out
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user profile
 *     description: Get authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized - missing or invalid token
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change password
 *     description: Change authenticated user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePassword'
 *     responses:
 *       200:
 *         description: Password successfully changed
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Current password is incorrect
 */
router.post('/change-password', authMiddleware, authController.changePassword);

/**
 * @swagger
 * /api/v1/auth/check-auth:
 *   get:
 *     tags: [Authentication]
 *     summary: Check authentication status
 *     description: Verify if user is authenticated
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User is authenticated
 *       401:
 *         description: User is not authenticated
 */
router.get('/check-auth', authMiddleware, authController.checkAuth);

module.exports = router;
