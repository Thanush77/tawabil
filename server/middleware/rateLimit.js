/**
 * Rate Limiting Middleware
 * Protects against abuse and DoS attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
        // Use X-Forwarded-For header if behind a proxy
        return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    }
});

/**
 * Order creation rate limiter
 * 10 orders per hour per IP
 */
const orderRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 orders per hour
    message: {
        success: false,
        message: 'Too many orders, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use phone number if available, otherwise IP
        return req.body?.customer?.phone ||
               req.headers['x-forwarded-for']?.split(',')[0].trim() ||
               req.ip;
    }
});

/**
 * Payment rate limiter
 * 5 payment attempts per 10 minutes per IP
 */
const paymentRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP to 5 payment attempts
    message: {
        success: false,
        message: 'Too many payment attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    }
});

/**
 * Strict rate limiter for sensitive operations
 * 3 requests per minute
 */
const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3,
    message: {
        success: false,
        message: 'Rate limit exceeded. Please wait a moment and try again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Custom rate limiter factory
 * Creates a rate limiter with custom settings
 */
const createRateLimiter = (options) => {
    const defaults = {
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Rate limit exceeded.'
        }
    };

    return rateLimit({ ...defaults, ...options });
};

module.exports = {
    generalLimiter,
    orderRateLimiter,
    paymentRateLimiter,
    strictLimiter,
    createRateLimiter
};
