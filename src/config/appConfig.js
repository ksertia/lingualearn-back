require('dotenv').config();

const appConfig = {
    port: process.env.PORT ,
    nodeEnv: process.env.NODE_ENV ,
    apiVersion: process.env.API_VERSION ,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    clientUrl: process.env.CLIENT_URL ,
    email: {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tokens: {
        resetTokenExpiry: parseInt(process.env.RESET_TOKEN_EXPIRY) ,
        verificationTokenExpiry: parseInt(process.env.VERIFICATION_TOKEN_EXPIRY) ,
        accessTokenExpiry: parseInt(process.env.ACCESS_TOKEN_EXPIRY) ,
        refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY) 
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
