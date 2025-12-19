require('dotenv').config();

const appConfig = {
    port: process.env.PORT || 4000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tokens: {
        resetTokenExpiry: parseInt(process.env.RESET_TOKEN_EXPIRY) || 3600,
        verificationTokenExpiry: parseInt(process.env.VERIFICATION_TOKEN_EXPIRY) || 86400,
        accessTokenExpiry: parseInt(process.env.ACCESS_TOKEN_EXPIRY) || 900,
        refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY) || 604800
    }
};

// Validation des variables requises
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`❌ Environment variable ${envVar} is required`);
    }
}

module.exports = { appConfig };
