const jwt = require('jsonwebtoken');
const { appConfig } = require('../config/appConfig');
const { AppError } = require('./errorHandler');
const { prisma } = require('../config/prisma');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            throw new AppError(401, 'Access denied. No token provided.');
        }

        const decoded = jwt.verify(token, appConfig.jwtSecret);
        
        // Vérifier que c'est bien un access token (pas un refresh token)
        if (decoded.tokenType !== 'access') {
            throw new AppError(401, 'Invalid token type. Access token required.');
        }
        
        // Vérifier si l'utilisateur existe toujours
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                phone: true,
                username: true,
                accountType: true,
                isVerified: true,
                isActive: true,
                lastLogin: true
            }
        });

        if (!user || !user.isActive) {
            throw new AppError(401, 'User account is disabled or does not exist.');
        }

        req.user = user;
        next();
    } catch (error) {
        // Distinguer les erreurs JWT des autres erreurs
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError(401, 'Invalid token.'));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AppError(401, 'Token expired.'));
        }
        // Si c'est déjà une AppError, la propager
        if (error instanceof AppError) {
            return next(error);
        }
        // Pour toute autre erreur (DB, etc.), retourner une erreur générique
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

module.exports = { authMiddleware, allowRoles };
