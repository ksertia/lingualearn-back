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
        name: 'Admin - Dashboard',
        description: 'Statistiques et tableau de bord administrateur',
      },
      {
        name: 'Admin - Courses',
        description: 'Gestion des cours (CRUD complet)',
      },
      {
        name: 'Admin - Users',
        description: 'Gestion des utilisateurs (admin)',
      },
    ],
  },
  apis: [
    './src/routes/index.js',
    './src/modules/auth/auth.routes.js',
    './src/modules/user/user.routes.js',
    './src/modules/admin/admin.routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;