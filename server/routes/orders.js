/**
 * Orders Routes
 * API endpoints for order management
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { validateOrder } = require('../middleware/validation');
const { orderRateLimiter } = require('../middleware/rateLimit');

// POST /api/orders - Create new order
router.post('/', orderRateLimiter, validateOrder, orderController.createOrder);

// GET /api/orders/:orderId - Get order details
router.get('/:orderId', orderController.getOrder);

// POST /api/orders/:orderId/cancel - Cancel order
router.post('/:orderId/cancel', orderController.cancelOrder);

// GET /api/orders/phone/:phone - Get orders by phone number
router.get('/phone/:phone', orderController.getOrdersByPhone);

module.exports = router;
