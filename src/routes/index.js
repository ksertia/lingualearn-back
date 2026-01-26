
const express = require('express');
const router = express.Router();

const adminDashboardRoutes = require('../modules/admin_dashboard/admin_dashboard.routes');
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/user/user.routes');
const learningPathsRoutes = require('../modules/learning_path/learning.path.routes');
const levelRoutes = require('../modules/Level/Level.routes');
const stepRoutes = require('../modules/learning_path/step.routes');
const exerciseRoutes = require('../modules/exercise/exercise.routes');
const stepQuizRoutes = require('../modules/step-quizzes/step-quizzes.routes');
const subscriptionPlanRoutes = require('../modules/subscription_plan/subscription_plan.routes');
const subscriptionRoutes = require('../modules/subscription/subscription.routes');
const messageWsRoutes = require('../modules/message_ws/message_ws.routes');
const gamificationRoutes = require('../modules/gamification/gamification.routes');


router.use('/admin', adminDashboardRoutes);
router.use('/levels', levelRoutes);
router.use('/steps', stepRoutes);
router.use('/exercises', exerciseRoutes);
router.use('/step-quizzes', stepQuizRoutes);
router.use('/subscription-plans', subscriptionPlanRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/messages-ws', messageWsRoutes);
router.use('/gamification', gamificationRoutes);

router.get('/', (req, res) => {
  res.json({
    message: '🚀 Authentication API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes des modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/learning-paths', learningPathsRoutes);

module.exports = router;
