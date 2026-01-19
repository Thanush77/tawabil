/**
 * Validation Middleware
 * Input validation and sanitization
 */

const { body, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }

    next();
};

/**
 * Validate cart items
 */
const validateCartItems = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('Cart must contain at least one item'),
    body('items.*.productId')
        .trim()
        .notEmpty()
        .withMessage('Product ID is required'),
    body('items.*.packSize')
        .trim()
        .notEmpty()
        .withMessage('Pack size is required'),
    body('items.*.quantity')
        .isInt({ min: 1, max: 100 })
        .withMessage('Quantity must be between 1 and 100'),
    handleValidationErrors
];

/**
 * Validate order creation
 */
const validateOrder = [
    // Customer validation
    body('customer.name')
        .trim()
        .notEmpty()
        .withMessage('Customer name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .escape(),
    body('customer.phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone number must be 10 digits'),
    body('customer.email')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail(),

    // Address validation
    body('address.houseNo')
        .trim()
        .notEmpty()
        .withMessage('House/Flat number is required')
        .isLength({ max: 200 })
        .withMessage('House number too long')
        .escape(),
    body('address.street')
        .trim()
        .notEmpty()
        .withMessage('Street is required')
        .isLength({ max: 200 })
        .withMessage('Street name too long')
        .escape(),
    body('address.area')
        .trim()
        .notEmpty()
        .withMessage('Area/Locality is required')
        .isLength({ max: 100 })
        .withMessage('Area name too long')
        .escape(),
    body('address.landmark')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 200 })
        .withMessage('Landmark too long')
        .escape(),
    body('address.pincode')
        .trim()
        .notEmpty()
        .withMessage('Pincode is required')
        .matches(/^560[0-9]{3}$/)
        .withMessage('We only deliver within Bengaluru (560xxx pincodes)'),
    body('address.notes')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage('Delivery notes too long')
        .escape(),

    // Items validation
    body('items')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),
    body('items.*.productId')
        .trim()
        .notEmpty()
        .withMessage('Product ID is required'),
    body('items.*.packSize')
        .trim()
        .notEmpty()
        .withMessage('Pack size is required'),
    body('items.*.quantity')
        .isInt({ min: 1, max: 100 })
        .withMessage('Quantity must be between 1 and 100'),

    // Delivery slot validation
    body('deliverySlot')
        .notEmpty()
        .withMessage('Delivery slot is required'),
    body('deliverySlot.date')
        .notEmpty()
        .withMessage('Delivery date is required'),

    // Payment method validation
    body('paymentMethod')
        .trim()
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['online', 'cod'])
        .withMessage('Invalid payment method'),

    handleValidationErrors
];

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
        .trim();
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }

    return obj;
};

/**
 * Sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    next();
};

module.exports = {
    validateCartItems,
    validateOrder,
    sanitizeInput,
    handleValidationErrors
};
