const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
// Suppression du HTTPS natif, car le SSL est géré par Nginx/Cloudflare
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { appConfig } = require('./config/appConfig');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');

const app = express();
const PORT = appConfig.port;

// =====================
// Middlewares de sécurité
// =====================
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));

// Supprimer les headers qui causent des warnings dans Swagger
app.use((req, res, next) => {
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("Origin-Agent-Cluster");
    next();
});

// =====================
// Parsing JSON / URL
// =====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =====================
// Logging des requêtes
// =====================
app.use(requestLogger);

// =====================
// Swagger documentation
// =====================
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        url: `https://213.32.120.11:${PORT}/api-docs/swagger.json`,
        docExpansion: 'none',
    },
}));

// Swagger JSON endpoint
app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// =====================
// Routes versionnées
// =====================
app.use(`/api/${appConfig.apiVersion}`, router);

// =====================
// Gestionnaire d'erreurs global
// =====================
app.use(errorHandler);

// =====================
// HTTP Server (SSL handled by Nginx/Cloudflare)
// =====================
app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║          🚀 API Server Started Successfully 🚀         ║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);
    console.log(`📍 Server running on port: ${PORT}`);
    console.log(`🌐 Environment: ${appConfig.nodeEnv}`);
    console.log(`📦 API Version: ${appConfig.apiVersion}\n`);

    console.log(`🔗 Useful Links:`);
    console.log(`   📍 Health Check: https://api.lingualearn.com/health`);
    console.log(`   🏠 Welcome: https://api.lingualearn.com/api/${appConfig.apiVersion}`);
    console.log(`   📚 Swagger UI: https://api.lingualearn.com/api-docs`);
    console.log(`   📄 Swagger JSON: https://api.lingualearn.com/api-docs/swagger.json\n`);

    console.log(`✅ Ready to accept requests...\n`);
});
