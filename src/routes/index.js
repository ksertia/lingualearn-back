const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/authMiddleware');
const { requireSubscription } = require('../middleware/requireSubscription');

const adminDashboardRoutes = require('../modules/admin_dashboard/admin_dashboard.routes');
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/user/user.routes');
const learningPathsRoutes = require('../modules/learning_path/learning.path.routes');
const levelRoutes = require('../modules/Level/Level.routes');
const stepRoutes = require('../modules/step/step.routes');
const exerciseRoutes = require('../modules/exercise/exercise.routes');
const courseRoutes = require('../modules/course/course.routes');
const stepQuizRoutes = require('../modules/step-quizzes/step-quizzes.routes');
const subscriptionPlanRoutes = require('../modules/subscription_plan/subscription_plan.routes');
const subscriptionRoutes = require('../modules/subscription/subscription.routes');
const messageWsRoutes = require('../modules/message_ws/message_ws.routes');
const gamificationRoutes = require('../modules/gamification/gamification.routes');
const notificationRoutes = require('../modules/notification/notification.routes');
const moduleRoutes = require('../modules/module/module.routes');
const languageRoutes = require('../modules/language/language.routes');
const discoverRoutes = require('../modules/discover/discover.routes');
const evaluationRoutes = require('../modules/evaluation/evaluation.routes');
const progressionRoutes = require('../modules/progression/progression.routes');
const uploadRoutes = require('../modules/upload/upload.routes');
const paymentRoutes = require('../modules/payment/payment.routes');
const transactionRoutes = require('../modules/transaction/transaction.routes');
const languageController = require('../modules/language/language.controller');
const levelController = require('../modules/Level/Level.controller');
const moduleController = require('../modules/module/module.controller');
const stepController = require('../modules/step/step.controller');
const learningPathController = require('../modules/learning_path/learning.path.controller');
const courseController = require('../modules/course/course.controller');

// ─── Routes publiques (aucun token requis) ────────────────────────────────────
router.use('/languages', languageRoutes);
router.use('/discover',  discoverRoutes);

// ─── Routes nécessitant authentification seule (token, sans abonnement) ───────
router.use('/auth',               authRoutes);
router.use('/subscription-plans', authMiddleware, subscriptionPlanRoutes);
router.use('/subscriptions',      authMiddleware, subscriptionRoutes);
router.use('/uploads',            authMiddleware, uploadRoutes);
router.use('/admin',              authMiddleware, adminDashboardRoutes);
router.use('/users',              authMiddleware, userRoutes);
router.use('/notifications',      authMiddleware, notificationRoutes);
router.use('/messages-ws',        authMiddleware, messageWsRoutes);
router.use('/levels',             authMiddleware, levelRoutes);
router.use('/payment',            authMiddleware, paymentRoutes);
router.use('/transactions',       authMiddleware, transactionRoutes);

// ─── Modules : visibles sans abonnement, mais parcours bloqués ───────────────
router.use('/modules',       authMiddleware, moduleRoutes);

// ─── Routes nécessitant authentification + abonnement actif ───────────────────
router.use('/steps',         authMiddleware, requireSubscription, stepRoutes);
router.use('/exercises',     authMiddleware, requireSubscription, exerciseRoutes);
router.use('/courses',       authMiddleware, requireSubscription, courseRoutes);
router.use('/step-quizzes',  authMiddleware, requireSubscription, stepQuizRoutes);
router.use('/learning-paths',authMiddleware, requireSubscription, learningPathsRoutes);
router.use('/evaluation',    authMiddleware, requireSubscription, evaluationRoutes);
router.use('/progression',   authMiddleware, requireSubscription, progressionRoutes);
router.use('/gamification',  authMiddleware, requireSubscription, gamificationRoutes);

// ─── Routes utilisateur : languages et levels publiques ──────────────────────
router.get('/users/:userId/languages',                       languageController.getByUserId);
router.post('/users/:userId/languages/:languageId/select',   languageController.selectLanguage);
router.get('/users/:userId/levels',                          levelController.getByUserId);
router.post('/users/:userId/levels/:levelId/select',         levelController.selectLevel);

router.get('/users/:userId/modules',                            authMiddleware, moduleController.getByUserId);
router.post('/users/:userId/modules/:moduleId/start',           authMiddleware, requireSubscription, moduleController.startModule);
router.post('/users/:userId/modules/:moduleId/complete',        authMiddleware, requireSubscription, moduleController.completeModule);

router.get('/users/:userId/learning-paths',                     authMiddleware, requireSubscription, learningPathController.getByUserId);
router.post('/users/:userId/learning-paths/:pathId/start',      authMiddleware, requireSubscription, learningPathController.startPath);
router.post('/users/:userId/learning-paths/:pathId/complete',   authMiddleware, requireSubscription, learningPathController.completePath);
router.get('/users/:userId/paths',                              authMiddleware, requireSubscription, learningPathController.getByUserId);
router.post('/users/:userId/paths/:pathId/start',               authMiddleware, requireSubscription, learningPathController.startPath);
router.post('/users/:userId/paths/:pathId/complete',            authMiddleware, requireSubscription, learningPathController.completePath);
router.get('/users/:userId/modules/:moduleId/paths',            authMiddleware, requireSubscription, learningPathController.getPathsByModuleId);
router.get('/users/:userId/modules/:moduleId/learning-paths',   authMiddleware, requireSubscription, learningPathController.getPathsByModuleId);

router.get('/users/:userId/steps',                              authMiddleware, requireSubscription, stepController.getByUserId);
router.post('/users/:userId/steps/:stepId/start',               authMiddleware, requireSubscription, stepController.startStep);
router.post('/users/:userId/steps/:stepId/complete',            authMiddleware, requireSubscription, stepController.completeStep);
router.get('/users/:userId/paths/:pathId/steps',                authMiddleware, requireSubscription, stepController.getStepsByPathId);
router.get('/users/:userId/learning-paths/:pathId/steps',       authMiddleware, requireSubscription, stepController.getStepsByPathId);

router.get('/users/:userId/courses',                            authMiddleware, requireSubscription, courseController.getCoursesByUserId);
router.post('/users/:userId/courses/:courseId/start',           authMiddleware, requireSubscription, courseController.startCourse);
router.post('/users/:userId/courses/:courseId/complete',        authMiddleware, requireSubscription, courseController.completeCourse);

router.get('/', (req, res) => {
  res.json({
    message: '🚀 Authentication API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
