const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const setupWebSocket = require('./ws');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const swaggerPersistenceMiddleware = require('./middleware/swaggerPersistence');
const ensureUserActiveDefaults = require('./middleware/ensureUserActiveDefaults');
const { appConfig } = require('./config/appConfig');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');
require('./utils/cron');

const app = express();

// =====================
// Ports
// =====================
const HTTPS_PORT = appConfig.port; // HTTPS pour Swagger
const HTTP_PORT = 4001;             // HTTP pour API front

// =====================
// Middlewares de sécurité
// =====================
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));

// Supprimer headers qui causent des warnings Swagger
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
// Servir les fichiers uploadés
// =====================
app.use('/uploads', express.static(__dirname + '/../uploads'));

// =====================
// Logging des requêtes
// =====================
app.use(requestLogger);

// =====================
// Middleware pour garantir les valeurs par défaut des utilisateurs
// =====================
app.use(ensureUserActiveDefaults);

// =====================
// Swagger documentation (HTTPS seulement)
// =====================
app.use('/api-docs', swaggerPersistenceMiddleware);
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        url: '/api-docs/swagger.json',
        docExpansion: 'none',
        persistAuthorization: true, // Conserver le token après rafraîchissement
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LinguaLearn API Documentation'
}));
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
// HTTPS Server (Swagger + API sécurisé)
// =====================
const httpsOptions = {
    key: fs.readFileSync(__dirname + '/../cert/server.key'),
    cert: fs.readFileSync(__dirname + '/../cert/server.crt')
};


const httpsServer = https.createServer(httpsOptions, app);
httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`✅ HTTPS server running on port ${HTTPS_PORT}`);
    console.log(`🔗 Swagger UI: https://213.32.120.11:${HTTPS_PORT}/api-docs`);
});
// WebSocket (Socket.IO) sur HTTPS
setupWebSocket(httpsServer);

// =====================
// HTTP Server (API non sécurisé pour front)
// =====================
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`⚡ HTTP server running on port ${HTTP_PORT}`);
    console.log(`🔗 API endpoints (HTTP): http://213.32.120.11:${HTTP_PORT}/api/${appConfig.apiVersion}`);
});


// =====================
// Logs Swagger et endpoints utiles
// =====================
console.log(`\n╔════════════════════════════════════════════════════════╗`);
console.log(`║          🚀 API Server Ready (HTTP & HTTPS) 🚀         ║`);
console.log(`╚════════════════════════════════════════════════════════╝\n`);
console.log(`📍 HTTPS port: ${HTTPS_PORT}`);
console.log(`📍 HTTP port (front): ${HTTP_PORT}`);
console.log(`🌐 Environment: ${appConfig.nodeEnv}`);
console.log(`📦 API Version: ${appConfig.apiVersion}\n`);
console.log(`🔗 Useful Links:`);
console.log(`   📚 Swagger UI: https://213.32.120.11:${HTTPS_PORT}/api-docs`);
console.log(`   📚 Swagger UI (localhost): https://localhost:${HTTPS_PORT}/api-docs`);
console.log(`   📄 Swagger JSON: https://213.32.120.11:${HTTPS_PORT}/api-docs/swagger.json`);
console.log(`   📚 API HTTP endpoints: http://213.32.120.11:${HTTP_PORT}/api/${appConfig.apiVersion}\n`);
console.log(`✅ Ready to accept requests...\n`);