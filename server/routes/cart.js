/**
 * Cart Routes
 * API endpoints for cart validation and calculation
 */

const express = require('express');
const router = express.Router();
const { validateCart, calculateTotals } = require('../controllers/cartController');
const { validateCartItems } = require('../middleware/validation');

// POST /api/cart/validate - Validate cart items and prices
router.post('/validate', validateCartItems, validateCart);

// POST /api/cart/calculate - Calculate cart totals
router.post('/calculate', validateCartItems, calculateTotals);

module.exports = router;
