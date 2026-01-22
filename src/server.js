const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const http = require('http');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { appConfig } = require('./config/appConfig');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');

// ===================================================
// APPS EXPRESS SÉPARÉES
// ===================================================
const apiApp = express();      // HTTP uniquement
const swaggerApp = express();  // HTTPS uniquement

// ===================================================
// CONFIG API APP (HTTP)
// ===================================================
apiApp.use(helmet());
apiApp.use(cors({ origin: true, credentials: true }));
apiApp.use(express.json({ limit: '10mb' }));
apiApp.use(express.urlencoded({ extended: true }));
apiApp.use(requestLogger);

// Routes API (HTTP SEULEMENT)
apiApp.use(`/api/${appConfig.apiVersion}`, router);

// Errors
apiApp.use(errorHandler);

// ===================================================
// CONFIG SWAGGER APP (HTTPS)
// ===================================================
swaggerApp.use('/api-docs', swaggerUi.serve);

swaggerApp.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        docExpansion: 'none',
        url: `https://213.32.120.11:${appConfig.port}/api-docs/swagger.json`
    }
}));

swaggerApp.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ===================================================
// SERVEURS
// ===================================================
const HTTP_PORT = 4001;               // API
const HTTPS_PORT = appConfig.port;    // Swagger

// ---------- HTTP SERVER (API) ----------
http.createServer(apiApp).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`⚡ API HTTP running`);
    console.log(`🔗 http://213.32.120.11:${HTTP_PORT}/api/${appConfig.apiVersion}`);
});

// ---------- HTTPS SERVER (Swagger) ----------
const httpsOptions = {
    key: fs.readFileSync(__dirname + '/../cert/server.key'),
    cert: fs.readFileSync(__dirname + '/../cert/server.crt')
};

https.createServer(httpsOptions, swaggerApp).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`📚 Swagger HTTPS running`);
    console.log(`🔗 https://213.32.120.11:${HTTPS_PORT}/api-docs`);
});

// ===================================================
// LOG FINAL
// ===================================================
console.log(`\n══════════════════════════════════════════════`);
console.log(`🚀 SERVER STARTED SUCCESSFULLY`);
console.log(`══════════════════════════════════════════════`);
console.log(`📌 API        : HTTP  (port ${HTTP_PORT})`);
console.log(`📌 Swagger    : HTTPS (port ${HTTPS_PORT})`);
console.log(`📌 API Version: ${appConfig.apiVersion}`);
console.log(`🌍 ENV        : ${appConfig.nodeEnv}`);
console.log(`══════════════════════════════════════════════\n`);
