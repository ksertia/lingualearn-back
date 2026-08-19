// Connexion Redis dédiée à BullMQ — séparée de src/config/redis.js car BullMQ
// exige maxRetriesPerRequest: null et gère lui-même ses reconnexions/retries.
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    maxRetriesPerRequest: null,
};

module.exports = { connection };
