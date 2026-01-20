/**
 * Order Controller
 * Handles order creation and management
 * Using Prisma for database operations
 */

const { prisma, generateOrderId } = require('../config/prisma');
const { getProductPrice } = require('./productController');

// Configuration
const DELIVERY_CHARGE = 40;
const FREE_DELIVERY_ABOVE = 500;

/**
 * Create new order
 * POST /api/orders
 */
exports.createOrder = async (req, res) => {
    try {
        const {
            customer,
            address,
            items,
            deliverySlot,
            paymentMethod
        } = req.body;

        // Validate and recalculate prices server-side
        const validatedItems = [];
        let subtotal = 0;

        for (const item of items) {
            const price = getProductPrice(item.productId, item.packSize);

            if (price === null) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid product: ${item.productId} (${item.packSize})`
                });
            }

            const total = price * item.quantity;
            subtotal += total;

            validatedItems.push({
                productId: item.productId,
                name: item.name,
                packSize: item.packSize,
                quantity: item.quantity,
                price: price,
                total: total
            });
        }

        // Calculate delivery charge
        const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE;
        const total = subtotal + deliveryCharge;

        // Generate order ID
        const orderId = generateOrderId();

        // Determine initial status based on payment method
        const initialStatus = paymentMethod === 'cod' ? 'CONFIRMED' : 'PENDING';
        const paymentStatus = 'PENDING';

        // Find or create customer
        let customerRecord = await prisma.customer.findUnique({
            where: { phone: customer.phone }
        });

        if (!customerRecord) {
            customerRecord = await prisma.customer.create({
                data: {
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email || null
                }
            });
        }

        // Create order with Prisma
        const order = await prisma.order.create({
            data: {
                orderId,
                customerId: customerRecord.id,
                address: address,
                items: validatedItems,
                subtotal,
                deliveryCharge,
                total,
                paymentMethod: paymentMethod === 'cod' ? 'COD' : 'ONLINE',
                paymentStatus,
                status: initialStatus,
                deliverySlot: deliverySlot || null,
                statusHistory: [{
                    status: initialStatus,
                    timestamp: new Date().toISOString()
                }]
            }
        });

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            orderId: order.orderId,
            data: {
                orderId: order.orderId,
                status: order.status,
                paymentStatus: order.paymentStatus,
                total: order.total,
                deliverySlot: order.deliverySlot
            }
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order'
        });
    }
};

/**
 * Get order details
 * GET /api/orders/:orderId
 */
exports.getOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: { orderId },
            include: { customer: true }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Error getting order:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving order'
        });
    }
};

/**
 * Cancel order
 * POST /api/orders/:orderId/cancel
 */
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await prisma.order.findUnique({
            where: { orderId }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled
        const cancellableStatuses = ['PENDING', 'CONFIRMED'];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel order with status: ${order.status}`
            });
        }

        // Update order status
        const statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
        statusHistory.push({
            status: 'CANCELLED',
            timestamp: new Date().toISOString(),
            note: reason || 'Cancelled by customer'
        });

        const updatedOrder = await prisma.order.update({
            where: { orderId },
            data: {
                status: 'CANCELLED',
                statusHistory
            }
        });

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: {
                orderId: updatedOrder.orderId,
                status: updatedOrder.status
            }
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling order'
        });
    }
};

/**
 * Get orders by phone number
 * GET /api/orders/phone/:phone
 */
exports.getOrdersByPhone = async (req, res) => {
    try {
        const { phone } = req.params;

        // Validate phone number
        if (!/^[0-9]{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number'
            });
        }

        // Find customer first
        const customer = await prisma.customer.findUnique({
            where: { phone }
        });

        if (!customer) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        // Get orders for customer
        const orders = await prisma.order.findMany({
            where: { customerId: customer.id },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders.map(order => ({
                orderId: order.orderId,
                status: order.status,
                total: order.total,
                itemCount: Array.isArray(order.items) ? order.items.length : 0,
                createdAt: order.createdAt,
                deliverySlot: order.deliverySlot
            }))
        });

    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving orders'
        });
    }
};
