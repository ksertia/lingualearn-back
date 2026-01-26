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
    ],
  },
  apis: [
    './src/routes/index.js',
    './src/modules/auth/auth.routes.js',
    './src/modules/user/user.routes.js',
    './src/modules/learning_path/learning.path.routes.js',
    './src/modules/level/level.routes.js',
    './src/modules/learning_path/step.routes.js',
    './src/modules/exercise/exercise.routes.js',
    './src/modules/step-quizzes/step-quizzes.routes.js',
    './src/modules/admin_dashboard/admin_dashboard.routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

