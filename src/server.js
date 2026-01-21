const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const https = require('https');
const http = require('http');
const fs = require('fs');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { appConfig } = require('./config/appConfig');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');

const app = express();
const HTTP_PORT = 4000;             // Port HTTP pour redirection
const HTTPS_PORT = appConfig.port;  // Port HTTPS principal

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
// Logging des requêtes
// =====================
app.use(requestLogger);

// =====================
// Swagger documentation
// =====================
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        url: `https://213.32.120.11:${HTTPS_PORT}/api-docs/swagger.json`,
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
// HTTPS Server
// =====================
const httpsOptions = {
    key: fs.readFileSync(__dirname + '/../cert/server.key'),
    cert: fs.readFileSync(__dirname + '/../cert/server.crt')
};

https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`✅ HTTPS server running on port ${HTTPS_PORT}`);
});

// =====================
// HTTP Server (redirection vers HTTPS)
// =====================
http.createServer((req, res) => {
    const host = req.headers['host'].split(':')[0]; // récupère juste l'IP ou nom de domaine
    res.writeHead(301, { "Location": `https://${host}:${HTTPS_PORT}${req.url}` });
    res.end();
}).listen(HTTP_PORT, () => {
    console.log(`⚡ HTTP server running on port ${HTTP_PORT} (redirecting to HTTPS)`);
});

// =====================
// Logs Swagger et endpoints utiles
// =====================
console.log(`\n╔════════════════════════════════════════════════════════╗`);
console.log(`║          🚀 API Server Ready (HTTP & HTTPS) 🚀         ║`);
console.log(`╚════════════════════════════════════════════════════════╝\n`);
console.log(`📍 HTTP redirect port: ${HTTP_PORT}`);
console.log(`📍 HTTPS port: ${HTTPS_PORT}`);
console.log(`🌐 Environment: ${appConfig.nodeEnv}`);
console.log(`📦 API Version: ${appConfig.apiVersion}\n`);
console.log(`🔗 Useful Links:`);
console.log(`   📚 Swagger UI: https://213.32.120.11:${HTTPS_PORT}/api-docs`);
console.log(`   📄 Swagger JSON: https://213.32.120.11:${HTTPS_PORT}/api-docs/swagger.json\n`);
console.log(`✅ Ready to accept requests...\n`);
