/**
 * Payment Controller
 * Handles Razorpay payment integration
 */

const crypto = require('crypto');
const Order = require('../models/Order');

// Razorpay configuration
let Razorpay;
let razorpayInstance;

try {
    Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} catch (error) {
    console.warn('Razorpay not configured. Payment features will be limited.');
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
        if (!razorpayInstance) {
            // Return mock order for development
            return res.status(200).json({
                success: true,
                data: {
                    id: `order_demo_${Date.now()}`,
                    amount: amount * 100,
                    currency: 'INR',
                    receipt: orderId,
                    status: 'created'
                }
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
        console.error('Error creating Razorpay order:', error);
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

        // Skip signature verification if Razorpay not configured (development mode)
        if (!process.env.RAZORPAY_KEY_SECRET) {
            // Mark as paid for demo purposes
            await order.markAsPaid(razorpay_payment_id || 'demo_payment', razorpay_signature || 'demo_signature');

            return res.status(200).json({
                success: true,
                message: 'Payment verified (demo mode)',
                data: {
                    orderId: order.orderId,
                    paymentStatus: order.paymentStatus,
                    status: order.status
                }
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
        console.error('Error verifying payment:', error);
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

        // Skip verification if webhook secret not configured
        if (webhookSecret) {
            const signature = req.headers['x-razorpay-signature'];

            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (signature !== expectedSignature) {
                console.warn('Invalid webhook signature');
                return res.status(400).json({ success: false });
            }
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
                console.log('Unhandled webhook event:', event.event);
        }

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error handling webhook:', error);
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
            console.log(`Order ${order.orderId} payment confirmed via webhook`);
        }
    } catch (error) {
        console.error('Error handling payment.captured:', error);
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
            console.log(`Order ${order.orderId} payment failed`);
        }
    } catch (error) {
        console.error('Error handling payment.failed:', error);
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
            console.log(`Order ${order.orderId} refunded`);
        }
    } catch (error) {
        console.error('Error handling refund.processed:', error);
    }
}
