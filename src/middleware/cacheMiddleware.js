const { cacheGet, cacheSet, TTL } = require('../utils/cache');

/**
 * Middleware Express de cache Redis pour requêtes GET.
 *
 * Usage :
 *   router.get('/languages', cacheRoute('languages:all', TTL.LONG), controller.getAll);
 *   router.get('/users/:id/stats', cacheRoute((req) => `user:${req.user.id}:stats`, TTL.SHORT), ...);
 *
 * @param {string|Function} keyOrFn  Clé fixe ou fonction (req) => string
 * @param {number} ttl               Durée en secondes (défaut: TTL.MEDIUM)
 */
function cacheRoute(keyOrFn, ttl = TTL.MEDIUM) {
    return async (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = typeof keyOrFn === 'function' ? keyOrFn(req) : keyOrFn;

        const cached = await cacheGet(key);
        if (cached !== null) {
            return res.status(200).json(cached);
        }

        // Intercepter res.json pour mettre en cache la réponse
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode === 200 && body) {
                cacheSet(key, body, ttl).catch(() => {});
            }
            return originalJson(body);
        };

        next();
    };
}

module.exports = { cacheRoute };
