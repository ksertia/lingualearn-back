const swaggerJsdoc = require('swagger-jsdoc');
const { appConfig } = require('./appConfig');

const options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'LinguaLearn Authentication API',
      version: '1.0.0',
      description: 'Authentication Backend API with Node.js, Express, Prisma and JWT',
      contact: {
        name: 'API Support',
        email: 'support@lingualearn.com',
      },
    },

    // 🔴 IMPORTANT : API EN HTTP UNIQUEMENT
    servers: [
      {
        url: 'http://localhost:4001',
        description: 'Développement local (HTTP)',
      },
      {
        url: 'http://213.32.120.11:4001',
        description: 'Production VPS (HTTP)',
      },
      {
        url: 'http://lingualearn-back-second.onrender.com',
        description: 'Production Render (HTTP)',
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: [
    './src/routes/index.js',
    './src/modules/auth/auth.routes.js',
    './src/modules/user/user.routes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
