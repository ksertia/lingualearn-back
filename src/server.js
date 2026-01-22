const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const http = require('http');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { appConfig } = require('./config/appConfig');
const swaggerSpec = require('./config/swagger');
const router = require('./routes');

const app = express();

// =====================
// PORT UNIQUE HTTP
// =====================
const PORT = appConfig.port || 4001;

// =====================
// Middlewares
// =====================
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));

// Fix Swagger warnings
app.use((req, res, next) => {
    res.removeHeader('Cross-Origin-Opener-Policy');
    res.removeHeader('Origin-Agent-Cluster');
    next();
});

// =====================
// Parsing
// =====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// =====================
// Logger
// =====================
app.use(requestLogger);

// =====================
// Swagger (HTTP)
// =====================
app.use('/api-docs', swaggerUi.serve);

app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        docExpansion: 'none',
        url: `http://213.32.120.11:${PORT}/api-docs/swagger.json`
    }
}));

app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// =====================
// API Routes
// =====================
app.use(`/api/${appConfig.apiVersion}`, router);

// =====================
// Error handler
// =====================
app.use(errorHandler);

// =====================
// HTTP SERVER
// =====================
http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log('\n══════════════════════════════════════');
    console.log('🚀 SERVER STARTED (HTTP ONLY)');
    console.log('══════════════════════════════════════');
    console.log(`🌐 Base URL   : http://213.32.120.11:${PORT}`);
    console.log(`📚 Swagger   : http://213.32.120.11:${PORT}/api-docs`);
    console.log(`📦 API       : http://213.32.120.11:${PORT}/api/${appConfig.apiVersion}`);
    console.log(`🌍 ENV       : ${appConfig.nodeEnv}`);
    console.log('══════════════════════════════════════\n');
});
