const Redis = require('ioredis');
const { logger } = require('../utils/logger');

let redis = null;
let redisAvailable = false;

function createRedisClient() {
    const options = {
        retryStrategy(times) {
            if (times >= 3) {
                redisAvailable = false;
                return null; // Arrêter les tentatives — cache désactivé silencieusement
            }
            return Math.min(times * 500, 2000);
        },
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 5000,
        keyPrefix: 'lingualearn:',
    };

    const client = process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL, options)
        : new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB) || 0,
            ...options,
        });

    client.on('connect', () => {
        redisAvailable = true;
        logger.info('Redis: connecté');
    });

    client.on('ready', () => {
        redisAvailable = true;
    });

    client.on('error', (err) => {
        redisAvailable = false;
        // Log une seule fois par type d'erreur pour ne pas spammer
        if (err.code === 'ECONNREFUSED') {
            logger.warn('Redis: serveur inaccessible — cache désactivé');
        } else {
            logger.error(`Redis: erreur -> ${err.message}`);
        }
    });

    client.on('close', () => {
        redisAvailable = false;
    });

    client.on('reconnecting', () => {
        logger.info('Redis: tentative de reconnexion...');
    });

    client.on('end', () => {
        redisAvailable = false;
        logger.warn('Redis: connexion terminée — cache désactivé');
    });

    return client;
}

redis = createRedisClient();

// Connexion initiale silencieuse
redis.connect().then(() => {
    redisAvailable = true;
}).catch(() => {
    redisAvailable = false;
    logger.warn('Redis: non disponible au démarrage — le serveur fonctionne sans cache');
});

process.on('SIGINT', async () => { if (redis) await redis.quit(); });
process.on('SIGTERM', async () => { if (redis) await redis.quit(); });

module.exports = { redis, isRedisAvailable: () => redisAvailable };
