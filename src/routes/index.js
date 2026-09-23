const express = require('express');
const router = express.Router();

const { authMiddleware, allowSelfOrRoles } = require('../middleware/authMiddleware');
const { requireSubscription } = require('../middleware/requireSubscription');

const adminDashboardRoutes = require('../modules/admin_dashboard/admin_dashboard.routes');
const appSettingRoutes = require('../modules/app_setting/app_setting.routes');
const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/user/user.routes');
const levelRoutes = require('../modules/Level/Level.routes');
const themeRoutes = require('../modules/theme/theme.routes');
const subThemeRoutes = require('../modules/sub-theme/sub-theme.routes');
const contentRoutes = require('../modules/content/content.routes');
const subThemeEvaluationRoutes = require('../modules/sub-theme-evaluation/sub-theme-evaluation.routes');
const progressRoutes = require('../modules/progress/progress.routes');
const subscriptionPlanRoutes = require('../modules/subscription_plan/subscription_plan.routes');
const subscriptionRoutes = require('../modules/subscription/subscription.routes');
const messageWsRoutes = require('../modules/message_ws/message_ws.routes');
const gamificationRoutes = require('../modules/gamification/gamification.routes');
const notificationRoutes = require('../modules/notification/notification.routes');
const languageRoutes = require('../modules/language/language.routes');
const discoverRoutes = require('../modules/discover/discover.routes');
const uploadRoutes = require('../modules/upload/upload.routes');
const paymentRoutes = require('../modules/payment/payment.routes');
const transactionRoutes = require('../modules/transaction/transaction.routes');
const referralRoutes = require('../modules/referral/referral.routes');
const languageController = require('../modules/language/language.controller');
const levelController = require('../modules/Level/Level.controller');
const themeController = require('../modules/theme/theme.controller');
const subThemeController = require('../modules/sub-theme/sub-theme.controller');

// ─── Routes publiques (aucun token requis) ────────────────────────────────────
router.use('/languages', languageRoutes);
router.use('/discover',  discoverRoutes);

// ─── Routes nécessitant authentification seule (token, sans abonnement) ───────
router.use('/auth',               authRoutes);
router.use('/subscription-plans', authMiddleware, subscriptionPlanRoutes);
router.use('/subscriptions',      authMiddleware, subscriptionRoutes);
router.use('/uploads',            authMiddleware, uploadRoutes);
router.use('/admin',              authMiddleware, adminDashboardRoutes);
router.use('/admin',              authMiddleware, appSettingRoutes);
router.use('/users',              authMiddleware, userRoutes);
router.use('/notifications',      authMiddleware, notificationRoutes);
router.use('/messages-ws',        authMiddleware, messageWsRoutes);
router.use('/levels',             authMiddleware, levelRoutes);
router.use('/payment',            authMiddleware, paymentRoutes);
router.use('/transactions',       authMiddleware, transactionRoutes);

// ─── Routes nécessitant authentification + abonnement actif ───────────────────
router.use('/themes',        authMiddleware, requireSubscription, themeRoutes);
router.use('/sub-themes',    authMiddleware, requireSubscription, subThemeRoutes);
router.use('/contents',      authMiddleware, requireSubscription, contentRoutes);
router.use('/evaluations',   authMiddleware, requireSubscription, subThemeEvaluationRoutes);
router.use('/progress',      authMiddleware, requireSubscription, progressRoutes);
router.use('/gamification',  authMiddleware, requireSubscription, gamificationRoutes);
router.use('/referral',      authMiddleware, referralRoutes);

// ─── Routes utilisateur : languages, levels, thèmes, sous-thèmes ─────────────
// allowSelfOrRoles : l'utilisateur ne peut agir que sur son propre userId (ou un
// admin/plateform_manager sur n'importe qui) — empêche un utilisateur authentifié
// quelconque de démarrer/compléter/sélectionner du contenu au nom d'un tiers.
router.get('/users/:userId/languages',                       authMiddleware, allowSelfOrRoles('userId', 'admin', 'plateform_manager'), languageController.getByUserId);
router.post('/users/:userId/languages/:languageId/select',   authMiddleware, allowSelfOrRoles('userId', 'admin', 'plateform_manager'), languageController.selectLanguage);
router.get('/users/:userId/levels',                          authMiddleware, allowSelfOrRoles('userId', 'admin', 'plateform_manager'), levelController.getByUserId);
router.post('/users/:userId/levels/:levelId/select',         authMiddleware, allowSelfOrRoles('userId', 'admin', 'plateform_manager'), levelController.selectLevel);

router.post('/users/:userId/themes/:themeId/start',             authMiddleware, requireSubscription, allowSelfOrRoles('userId', 'admin', 'plateform_manager'), themeController.startTheme);
router.post('/users/:userId/themes/:themeId/complete',          authMiddleware, requireSubscription, allowSelfOrRoles('userId', 'admin', 'plateform_manager'), themeController.completeTheme);

router.post('/users/:userId/sub-themes/:subThemeId/start',      authMiddleware, requireSubscription, allowSelfOrRoles('userId', 'admin', 'plateform_manager'), subThemeController.startSubTheme);
router.post('/users/:userId/sub-themes/:subThemeId/complete',   authMiddleware, requireSubscription, allowSelfOrRoles('userId', 'admin', 'plateform_manager'), subThemeController.completeSubTheme);

router.get('/', (req, res) => {
  res.json({
    message: '🚀 Authentication API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
