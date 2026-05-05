const { redis } = require('../config/redis');
const { logger } = require('./logger');

// TTL constants (en secondes)
const TTL = {
    SHORT: 60 * 5,        // 5 min  — données utilisateur fréquentes
    MEDIUM: 60 * 15,      // 15 min — contenu semi-statique
    LONG: 60 * 60,        // 1h     — contenu statique
    DAY: 60 * 60 * 24,    // 24h    — référence stable (plans, badges)
};

/**
 * Récupère une valeur depuis Redis.
 * Retourne null si clé absente, Redis indisponible, ou erreur.
 */
async function cacheGet(key) {
    try {
        const value = await redis.get(key);
        if (value === null) return null;
        return JSON.parse(value);
    } catch (err) {
        logger.warn(`cache.get [${key}]: ${err.message}`);
        return null;
    }
}

/**
 * Stocke une valeur dans Redis avec un TTL.
 */
async function cacheSet(key, data, ttl = TTL.MEDIUM) {
    try {
        await redis.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (err) {
        logger.warn(`cache.set [${key}]: ${err.message}`);
    }
}

/**
 * Supprime une ou plusieurs clés.
 */
async function cacheDel(...keys) {
    try {
        if (keys.length > 0) await redis.del(...keys);
    } catch (err) {
        logger.warn(`cache.del [${keys.join(',')}]: ${err.message}`);
    }
}

/**
 * Supprime toutes les clés qui correspondent à un pattern (ex: "user:42:*").
 * Utilise SCAN pour ne pas bloquer Redis.
 */
async function cacheInvalidatePattern(pattern) {
    try {
        let cursor = '0';
        do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) await redis.del(...keys);
        } while (cursor !== '0');
    } catch (err) {
        logger.warn(`cache.invalidatePattern [${pattern}]: ${err.message}`);
    }
}

/**
 * Cache-aside helper : si la clé existe on retourne la valeur,
 * sinon on exécute fn(), on stocke le résultat et on le retourne.
 */
async function cacheWrap(key, fn, ttl = TTL.MEDIUM) {
    const cached = await cacheGet(key);
    if (cached !== null) return cached;

    const data = await fn();
    if (data !== null && data !== undefined) {
        await cacheSet(key, data, ttl);
    }
    return data;
}

module.exports = { cacheGet, cacheSet, cacheDel, cacheInvalidatePattern, cacheWrap, TTL };
