const { redis, isRedisAvailable } = require('../config/redis');
const { logger } = require('./logger');

// TTL constants (en secondes)
const TTL = {
    SHORT:  60 * 5,        // 5 min  — données utilisateur fréquentes
    MEDIUM: 60 * 15,       // 15 min — contenu semi-statique
    LONG:   60 * 60,       // 1h     — contenu statique
    DAY:    60 * 60 * 24,  // 24h    — référence stable (plans, badges)
};

async function cacheGet(key) {
    if (!isRedisAvailable()) return null;
    try {
        const value = await redis.get(key);
        return value === null ? null : JSON.parse(value);
    } catch (err) {
        logger.warn(`cache.get [${key}]: ${err.message}`);
        return null;
    }
}

async function cacheSet(key, data, ttl = TTL.MEDIUM) {
    if (!isRedisAvailable()) return;
    try {
        await redis.set(key, JSON.stringify(data), 'EX', ttl);
    } catch (err) {
        logger.warn(`cache.set [${key}]: ${err.message}`);
    }
}

async function cacheDel(...keys) {
    if (!isRedisAvailable() || keys.length === 0) return;
    try {
        await redis.del(...keys);
    } catch (err) {
        logger.warn(`cache.del [${keys.join(',')}]: ${err.message}`);
    }
}

async function cacheInvalidatePattern(pattern) {
    if (!isRedisAvailable()) return;
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

// Cache-aside : retourne le cache si présent, sinon exécute fn() et met en cache
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
