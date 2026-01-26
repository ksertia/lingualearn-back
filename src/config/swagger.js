// ...existing code...
const swaggerJsdoc = require('swagger-jsdoc');
const { appConfig } = require('./appConfig');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LinguaLearn API',
      version: '1.0.0',
      description: 'API complète pour la plateforme LinguaLearn - Authentication, Users & Admin',
      contact: {
        name: 'API Support',
        email: 'support@lingualearn.com',
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
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Format: Bearer {token}',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Endpoints d\'authentification (inscription, connexion, etc.)',
      },
      {
        name: 'Users',
        description: 'Gestion du profil utilisateur',
      },
      {
        name: 'LearningPaths',
        description: 'Gestion des parcours (LearningPath)'
      },
      {
        name: 'Levels',
        description: 'Gestion des niveaux (Level)'
      },
      {
        name: 'Steps',
        description: 'Gestion des étapes (Step)'
      },
      {
        name: 'Exercises',
        description: 'Gestion des exercices (Exercise)'
      },
      {
        name: 'StepQuizzes',
        description: 'Gestion des quiz d\'étape (StepQuiz)'
      },
      {
        name: 'AdminDashboard',
        description: 'Statistiques et état global de la plateforme'
      },
      {
        name: 'SubscriptionPlans',
        description: 'Gestion des plans d\'abonnement'
      },
      {
        name: 'Subscriptions',
        description: 'Gestion des abonnements clients'
      },
      {
        name: 'MessagesWS',
        description: 'Messagerie temps réel (WebSocket)'
      },
      {
        name: 'Notifications',
        description: 'Gestion des notifications (REST + WebSocket)'
      },
      {
        name: 'Gamification',
        description: 'Gestion des badges et récompenses'
      },
      {
        name: 'Course',
        description: 'Gestion des cours (Course)'
      },
    ],
  },
  apis: [
    './src/routes/index.js',
    './src/modules/auth/auth.routes.js',
    './src/modules/user/user.routes.js',
    './src/modules/learning_path/learning.path.routes.js',
    './src/modules/level/level.routes.js',
    './src/modules/step/step.routes.js',
    './src/modules/exercise/exercise.routes.js',
    './src/modules/step-quizzes/step-quizzes.routes.js',
    './src/modules/admin_dashboard/admin_dashboard.routes.js',
    './src/modules/subscription_plan/subscription_plan.routes.js',
    './src/modules/subscription/subscription.routes.js',
    './src/modules/message_ws/message_ws.routes.js',
    './src/modules/notification/notification.routes.js',
    './src/modules/gamification/gamification.routes.js',
    './src/modules/course/course.routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

