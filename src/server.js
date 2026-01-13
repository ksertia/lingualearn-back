const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const https = require('https');
const fs = require('fs');
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
    origin: (origin, callback) => {
        if (appConfig.nodeEnv === 'production') {
            if (origin === `https://213.32.120.11:${PORT}` || !origin) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        } else {
            // Autoriser toutes les origines en développement
            return callback(null, true);
        }
    },
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
// HTTPS Server
// =====================
const httpsOptions = {
    key: fs.readFileSync(__dirname + '/../cert/server.key'),
    cert: fs.readFileSync(__dirname + '/../cert/server.crt')
};

https.createServer(httpsOptions, app).listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════════╗`);
    console.log(`║          🚀 HTTPS API Server Started Successfully 🚀    ║`);
    console.log(`╚════════════════════════════════════════════════════════╝\n`);
    console.log(`📍 Server running on port: ${PORT}`);
    console.log(`🌐 Environment: ${appConfig.nodeEnv}`);
    console.log(`📦 API Version: ${appConfig.apiVersion}\n`);

    console.log(`🔗 Useful Links:`);
    console.log(`   📍 Health Check: https://localhost:${PORT}/health`);
    console.log(`   🏠 Welcome: https://localhost:${PORT}/api/${appConfig.apiVersion}`);
    console.log(`   📚 Swagger UI: https://localhost:${PORT}/api-docs`);
    console.log(`   📄 Swagger JSON: https://localhost:${PORT}/api-docs/swagger.json\n`);
    console.log(`   📚 Swagger UI: https://213.32.120.11:${PORT}/api-docs`);
    console.log(`   📄 Swagger JSON: https://213.32.120.11:${PORT}/api-docs/swagger.json\n`);

    console.log(`✅ Ready to accept requests...\n`);
});
