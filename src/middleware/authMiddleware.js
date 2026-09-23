const jwt = require('jsonwebtoken');
const { appConfig } = require('../config/appConfig');
const { AppError } = require('./errorHandler');
const { prisma } = require('../config/prisma');
const { cacheGet, cacheSet, cacheDel, TTL } = require('../utils/cache');

// Cache user auth info for TTL.SHORT (5min) to avoid a DB hit on every request
async function getCachedUser(userId) {
    const key = `auth:user:${userId}`;
    const cached = await cacheGet(key);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true, email: true, phone: true, username: true,
            accountType: true, parentId: true, isVerified: true,
            isActive: true, lastLogin: true
        }
    });

    if (user) await cacheSet(key, user, TTL.SHORT);
    return user;
}

// Call this when a user is deactivated/deleted to force re-auth on next request
async function invalidateAuthCache(userId) {
    await cacheDel(`auth:user:${userId}`);
}

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new AppError(401, 'Access denied. No token provided.');

        const decoded = jwt.verify(token, appConfig.jwtSecret);
        if (decoded.tokenType !== 'access') throw new AppError(401, 'Invalid token type. Access token required.');

        // Redis cache hit → zero DB query on repeat requests
        const user = await getCachedUser(decoded.userId);

        if (!user || !user.isActive) throw new AppError(401, 'User account is disabled or does not exist.');

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') return next(new AppError(401, 'Invalid token.'));
        if (error.name === 'TokenExpiredError') return next(new AppError(401, 'Token expired.'));
        if (error instanceof AppError) return next(error);
        return next(new AppError(500, 'Authentication error.'));
    }
};

const allowRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError(401, 'Authentication required.'));
        }

        if (!roles.includes(req.user.accountType)) {
            return next(new AppError(403, 'Insufficient permissions.'));
        }

        next();
    };
};

// Autorise l'utilisateur agissant sur son propre id (req.params[paramName] === req.user.id),
// ou un utilisateur ayant l'un des rôles listés (ex: admin) agissant sur n'importe quel id.
// Empêche un utilisateur authentifié quelconque d'accéder aux données d'un autre via un
// :userId/:id arbitraire dans l'URL.
const allowSelfOrRoles = (paramName, ...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError(401, 'Authentication required.'));
        }

        const targetId = req.params[paramName];
        if (req.user.id === targetId) {
            return next();
        }

        if (roles.includes(req.user.accountType)) {
            return next();
        }

        return next(new AppError(403, 'Insufficient permissions.'));
    };
};

module.exports = { authMiddleware, allowRoles, allowSelfOrRoles, invalidateAuthCache };
