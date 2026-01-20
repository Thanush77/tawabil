/**
 * Payment Controller
 * Handles Razorpay payment integration
 */

const crypto = require('crypto');
const Order = require('../models/Order');

// Razorpay configuration
let Razorpay;
let razorpayInstance;
let isRazorpayConfigured = false;

try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        Razorpay = require('razorpay');
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        isRazorpayConfigured = true;
    }
} catch (error) {
    // Razorpay initialization failed - online payments will be disabled
    isRazorpayConfigured = false;
}

/**
 * Create Razorpay order
 * POST /api/payments/create-order
 */
exports.createRazorpayOrder = async (req, res) => {
    try {
        const { orderId, amount } = req.body;

        if (!orderId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and amount are required'
            });
        }

        // Find the order
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Verify amount matches order total
        if (Math.round(amount) !== Math.round(order.total)) {
            return res.status(400).json({
                success: false,
                message: 'Amount mismatch'
            });
        }

        // Check if Razorpay is configured
        if (!isRazorpayConfigured || !razorpayInstance) {
            // SECURITY: Do not allow online payments without proper Razorpay configuration
            return res.status(503).json({
                success: false,
                message: 'Online payment is currently unavailable. Please use Cash on Delivery.'
            });
        }

        // Create Razorpay order
        const razorpayOrder = await razorpayInstance.orders.create({
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            receipt: orderId,
            notes: {
                orderId: orderId,
                customerPhone: order.customer.phone
            }
        });

        // Update order with Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        res.status(200).json({
            success: true,
            data: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                receipt: razorpayOrder.receipt
            }
        });

    } catch (error) {
        // Error logged for debugging
        process.env.NODE_ENV !== 'production' && console.error('Error creating Razorpay order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating payment order'
        });
    }
};

/**
 * Verify payment signature
 * POST /api/payments/verify
 */
exports.verifyPayment = async (req, res) => {
    try {
        const {
            orderId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Find the order
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // SECURITY: Require Razorpay configuration for payment verification
        if (!process.env.RAZORPAY_KEY_SECRET) {
            return res.status(503).json({
                success: false,
                message: 'Payment verification unavailable. Please contact support.'
            });
        }

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            // Update order with failed payment
            order.paymentStatus = 'failed';
            await order.save();

            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Mark order as paid
        await order.markAsPaid(razorpay_payment_id, razorpay_signature);

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                orderId: order.orderId,
                paymentStatus: order.paymentStatus,
                status: order.status
            }
        });

    } catch (error) {
        // Error logged for debugging
        process.env.NODE_ENV !== 'production' && console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment'
        });
    }
};

/**
 * Handle Razorpay webhook
 * POST /api/payments/webhook
 */
exports.handleWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // SECURITY: Require webhook secret for production
        if (!webhookSecret) {
            return res.status(503).json({
                success: false,
                message: 'Webhook not configured'
            });
        }

        const signature = req.headers['x-razorpay-signature'];

        if (!signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing signature'
            });
        }

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(401).json({
                success: false,
                message: 'Invalid signature'
            });
        }

        const event = req.body;

        // Handle different webhook events
        switch (event.event) {
            case 'payment.captured':
                await handlePaymentCaptured(event.payload.payment.entity);
                break;

            case 'payment.failed':
                await handlePaymentFailed(event.payload.payment.entity);
                break;

            case 'refund.processed':
                await handleRefundProcessed(event.payload.refund.entity);
                break;

            default:
                // Unhandled event type - logged in development only
                break;
        }

        res.status(200).json({ success: true });

    } catch (error) {
        // Error logged for debugging
        process.env.NODE_ENV !== 'production' && console.error('Error handling webhook:', error);
        res.status(500).json({ success: false });
    }
};

// Helper functions for webhook handlers
async function handlePaymentCaptured(payment) {
    try {
        const order = await Order.findOne({
            razorpayOrderId: payment.order_id
        });

        if (order && order.paymentStatus !== 'paid') {
            order.razorpayPaymentId = payment.id;
            order.paymentStatus = 'paid';
            order.status = 'confirmed';
            await order.save();
        }
    } catch (error) {
        // Error logged for debugging
        process.env.NODE_ENV !== 'production' && console.error('Error handling payment.captured:', error);
    }
}

async function handlePaymentFailed(payment) {
    try {
        const order = await Order.findOne({
            razorpayOrderId: payment.order_id
        });

        if (order) {
            order.paymentStatus = 'failed';
            await order.save();
        }
    } catch (error) {
        // Error logged for debugging
        process.env.NODE_ENV !== 'production' && console.error('Error handling payment.failed:', error);
    }
}

async function handleRefundProcessed(refund) {
    try {
        const order = await Order.findOne({
            razorpayPaymentId: refund.payment_id
        });

        if (order) {
            order.paymentStatus = 'refunded';
            await order.updateStatus('cancelled', 'Refund processed');
        }
    } catch (error) {
        // Error logged for debugging
        process.env.NODE_ENV !== 'production' && console.error('Error handling refund.processed:', error);
    }
}
