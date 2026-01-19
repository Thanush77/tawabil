/**
 * Payments Routes
 * API endpoints for Razorpay integration
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { paymentRateLimiter } = require('../middleware/rateLimit');

// POST /api/payments/create-order - Create Razorpay order
router.post('/create-order', paymentRateLimiter, paymentController.createRazorpayOrder);

// POST /api/payments/verify - Verify payment signature
router.post('/verify', paymentController.verifyPayment);

// POST /api/payments/webhook - Razorpay webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;
