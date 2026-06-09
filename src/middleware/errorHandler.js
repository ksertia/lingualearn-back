const { logger } = require('../utils/logger');

class AppError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

const errorHandler = (err, req, res, next) => {
    // Erreur opérationnelle (4xx) → warn ; erreur serveur (5xx) → error
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            logger.error('Server error:', { message: err.message, stack: err.stack, url: req.url, method: req.method });
        } else {
            logger.warn(`${err.statusCode} ${err.message}`, { url: req.url, method: req.method });
        }
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    // Erreur inattendue (toujours loggée en error avec stack)
    logger.error('Unexpected error:', { message: err.message, stack: err.stack, url: req.url, method: req.method });

    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(500).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = { errorHandler, AppError };
