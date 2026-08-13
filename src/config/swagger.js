// ...existing code...
const swaggerJsdoc = require('swagger-jsdoc');
const { appConfig } = require('./appConfig');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tibi API',
      version: '1.0.0',
      description: 'API complète pour la plateforme Tibi - Authentication, Users & Admin',
      contact: {
        name: 'API Support',
        email: 'support@tibi.com',
      },
    },
    servers: [
      {
        url: 'https://localhost:4000',
        description: 'Développement local (HTTPS)',
      },
      {
        url: 'https://213.32.120.11:4000',
        description: 'Production (VPS)',
      },
      {
        url: 'https://lingualearn-back-second-1.onrender.com',
        description: 'Production (Render.com)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Format: Bearer {token}',
          // Configuration pour la persistance du token
          'x-tokenName': 'Authorization',
          'x-persistAuthorization': true
        },
      },
      schemas: {
        Language: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clq1x2abc0000v2l3k9x9x9x9' },
            code: { type: 'string', example: 'FR' },
            name: { type: 'string', example: 'Français' },
            description: { type: 'string', example: 'Langue française' },
            iconUrl: { type: 'string', example: 'https://cdn.tibi.com/icons/fr.png' },
            isActive: { type: 'boolean', example: true },
            index: { type: 'integer', example: 1 }
          }
        },
        UserProgress: {
          type: 'object',
          description: 'Progression informative — aucun blocage, uniquement un pourcentage.',
          properties: {
            id: { type: 'string', example: 'progress123' },
            progressPercentage: { type: 'number', example: 65.5 },
            startedAt: { type: 'string', example: '2024-01-15T10:35:00Z' },
            completedAt: { type: 'string', example: null },
            lastAccessedAt: { type: 'string', example: '2024-01-15T14:20:00Z' }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Progression initialisée avec succès' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Utilisateur non trouvé' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Languages',
        description: 'Gestion des langues et de leurs niveaux/modules'
      },
      {
        name: 'Discover',
        description: 'Découverte de l\'application, choix de langue, exercices de découverte, etc.'
      },
      {
        name: 'Evaluation',
        description: 'Test de niveau à l\'inscription (lié à Discover) — distinct du tag Evaluations (sous-thèmes)'
      },
      {
        name: 'Progress',
        description: 'Suivi de progression informatif — aucun blocage, uniquement un pourcentage d\'avancement'
      },
      {
        name: 'AppSettings',
        description: 'Paramètres globaux de la plateforme — durée du trial, etc. (admin uniquement)'
      },
      {
        name: 'Theme',
        description: 'Gestion des thèmes (regroupement de sous-thèmes au sein d\'un Module)'
      },
      {
        name: 'SubTheme',
        description: 'Gestion des sous-thèmes (regroupent plusieurs contenus + une évaluation optionnelle)'
      },
      {
        name: 'Content',
        description: 'Gestion des contenus d\'un sous-thème (cours, vidéo, exercice, ressource) et de leurs blocs'
      },
      {
        name: 'Evaluations',
        description: 'Évaluation de fin de sous-thème (distinct du module evaluation lié à Discover)'
      },
    ],
  },
  apis: [
    './src/routes/index.js',
    './src/modules/auth/auth.routes.js',
    './src/modules/user/user.routes.js',
    './src/modules/Level/Level.routes.js',
    './src/modules/theme/theme.routes.js',
    './src/modules/sub-theme/sub-theme.routes.js',
    './src/modules/content/content.routes.js',
    './src/modules/sub-theme-evaluation/sub-theme-evaluation.routes.js',
    './src/modules/progress/progress.routes.js',
    './src/modules/admin_dashboard/admin_dashboard.routes.js',
    './src/modules/subscription_plan/subscription_plan.routes.js',
    './src/modules/subscription/subscription.routes.js',
    './src/modules/message_ws/message_ws.routes.js',
    './src/modules/notification/notification.routes.js',
    './src/modules/gamification/gamification.routes.js',
    './src/modules/upload/upload.routes.js',
    './src/modules/module/module.routes.js',
    './src/modules/language/language.routes.js',
    './src/modules/evaluation/evaluation.routes.js',
    './src/modules/discover/discover.routes.js',
    './src/modules/app_setting/app_setting.routes.js',
    './src/modules/referral/referral.routes.js',
    './src/modules/transaction/transaction.routes.js',
    './src/modules/payment/payment.routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

