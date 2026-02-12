const express = require('express');
const router = express.Router();

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
const languageController = require('../modules/language/language.controller');
const levelController = require('../modules/Level/Level.controller');
const moduleController = require('../modules/module/module.controller');
const stepController = require('../modules/step/step.controller');
const learningPathController = require('../modules/learning_path/learning.path.controller');
const courseController = require('../modules/course/course.controller');


// Mounting module routes
router.use('/notifications', notificationRoutes);
router.use('/admin', adminDashboardRoutes);
router.use('/levels', levelRoutes);
router.use('/steps', stepRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/courses', courseRoutes);
router.use('/step-quizzes', stepQuizRoutes);
router.use('/subscription-plans', subscriptionPlanRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/messages-ws', messageWsRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/learning-paths', learningPathsRoutes);
router.use('/modules', moduleRoutes);

router.use('/languages', languageRoutes);
router.use('/discover', discoverRoutes);
router.use('/evaluation', evaluationRoutes);
router.use('/progression', progressionRoutes);

// User language and level selection routes (mounted under /api/v1)
router.post('/users/:userId/languages/:languageId/select', languageController.selectLanguage);
router.post('/users/:userId/levels/:levelId/select', levelController.selectLevel);

// User module progression routes (mounted under /api/v1)
router.get('/users/:userId/modules', moduleController.getByUserId);
router.post('/users/:userId/modules/:moduleId/start', moduleController.startModule);
router.post('/users/:userId/modules/:moduleId/complete', moduleController.completeModule);

// User learning path progression routes (mounted under /api/v1)
router.get('/users/:userId/learning-paths', learningPathController.getByUserId);
router.post('/users/:userId/learning-paths/:pathId/start', learningPathController.startPath);
router.post('/users/:userId/learning-paths/:pathId/complete', learningPathController.completePath);

// User step progression routes (mounted under /api/v1)
router.get('/users/:userId/steps', stepController.getByUserId);
router.post('/users/:userId/steps/:stepId/start', stepController.startStep);
router.post('/users/:userId/steps/:stepId/complete', stepController.completeStep);

// User course progression routes (mounted under /api/v1)
router.get('/users/:userId/courses', courseController.getCoursesByUserId);
router.post('/users/:userId/courses/:courseId/start', courseController.startCourse);
router.post('/users/:userId/courses/:courseId/complete', courseController.completeCourse);

router.get('/', (req, res) => {
  res.json({
    message: '🚀 Authentication API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
