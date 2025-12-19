const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { appConfig } = require('./config/appConfig');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');

const app = express();
const PORT = appConfig.port;

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        if (appConfig.nodeEnv === 'production') {
            // Autoriser uniquement le Swagger en prod
            if (origin === 'http://213.32.120.11:4000' || !origin) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        } else {
            // En dev, autoriser le client local
            if (origin === appConfig.clientUrl || !origin) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging des requêtes
app.use(requestLogger);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        url: '/api-docs/swagger.json',
    },
}));

// Swagger JSON endpoint
app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Routes avec versioning
app.use(`/api/${appConfig.apiVersion}`, router);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║          🚀 API Server Started Successfully 🚀         ║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);
    console.log(`📍 Server running on port: ${PORT}`);
    console.log(`🌐 Environment: ${appConfig.nodeEnv}`);
    console.log(`📦 API Version: ${appConfig.apiVersion}\n`);
    
    console.log(`🔗 Useful Links:`);
    console.log(`   📍 Health Check: http://localhost:${PORT}/health`);
    console.log(`   🏠 Welcome: http://localhost:${PORT}/api/${appConfig.apiVersion}`);
    console.log(`   📚 Swagger UI: http://localhost:${PORT}/api-docs`);
    console.log(`   📄 Swagger JSON: http://localhost:${PORT}/api-docs/swagger.json\n`);
    
    console.log(`✅ Ready to accept requests...\n`);
});
