const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const setupWebSocket = require('./ws');
require('dotenv').config();

// =====================
// Crash guards — évite que le process meure sur une exception non gérée
// =====================
process.on('uncaughtException', (err) => {
    console.error('[FATAL] uncaughtException:', err.message, err.stack);
    // Laisser le process vivre — nodemon/PM2 peut le redémarrer si nécessaire
});

process.on('unhandledRejection', (reason) => {
    console.error('[WARN] unhandledRejection:', reason);
});

const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const swaggerPersistenceMiddleware = require('./middleware/swaggerPersistence');
const ensureUserActiveDefaults = require('./middleware/ensureUserActiveDefaults');
const { appConfig } = require('./config/appConfig');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');
require('./utils/cron');
const repairMissingProgression = require('./utils/bootRepair');

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

// =====================
// Rate limiting global — protège contre les attaques et surcharges
// =====================
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 minute
    max: 300,                    // 300 requêtes/min par IP (5/sec) — ajuster selon besoin
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Trop de requêtes. Réessayez dans une minute.' },
    skip: (req) => req.path.startsWith('/api-docs'), // Swagger pas limité
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 20,                    // 20 tentatives auth/15min par IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

app.use(globalLimiter);
// Appliquer le limiter strict sur les routes auth
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);

// Supprimer headers qui causent des warnings Swagger
app.use((req, res, next) => {
    res.removeHeader("Cross-Origin-Opener-Policy");
    res.removeHeader("Origin-Agent-Cluster");
    next();
});

// =====================
// Timeout global — tue les requêtes qui dépassent 30s (évite saturation thread pool)
// =====================
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        if (!res.headersSent) {
            res.status(503).json({ success: false, error: 'Request timeout — le serveur est surchargé.' });
        }
    });
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
// Injecter io dans req pour les controllers
// =====================
const { getIo } = require('./ws');
app.use((req, res, next) => {
  req.io = getIo();
  next();
});

// =====================
// Healthcheck — utilisé par load balancer / monitoring
// =====================
app.get('/health', async (req, res) => {
    const { prisma } = require('./config/prisma');
    const { isRedisAvailable } = require('./config/redis');
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({
            status: 'ok',
            db: 'connected',
            redis: isRedisAvailable() ? 'connected' : 'unavailable',
            uptime: Math.floor(process.uptime()),
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        });
    } catch {
        res.status(503).json({ status: 'error', db: 'disconnected' });
    }
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
    // Réparation auto de la progression au démarrage (fire-and-forget)
    repairMissingProgression().catch(() => {});
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