const Redis = require('ioredis');
const { logger } = require('../utils/logger');

const redisOptions = {
    retryStrategy(times) {
        if (times > 10) {
            logger.error('Redis: impossible de se connecter après 10 tentatives');
            return null;
        }
        return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
    enableOfflineQueue: false,
};

const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisOptions)
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        ...redisOptions,
    });

redis.on('connect', () => logger.info('Redis: connecté'));
redis.on('error', (err) => logger.error(`Redis: erreur -> ${err.message || err.code || JSON.stringify(err)}`));
redis.on('close', () => logger.warn('Redis: connexion fermée'));

// Connexion initiale
redis.connect().catch((err) => logger.error(`Redis: échec de connexion initiale -> ${err.message || err.code || JSON.stringify(err)}`));

process.on('SIGINT', async () => { await redis.quit(); });
process.on('SIGTERM', async () => { await redis.quit(); });

module.exports = { redis };
