/**
 * Order Controller
 * Handles order creation and management
 */

const Order = require('../models/Order');
const Customer = require('../models/Customer');
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
        const orderId = Order.generateOrderId();

        // Create order
        const order = new Order({
            orderId,
            customer: {
                name: customer.name,
                phone: customer.phone,
                email: customer.email || undefined
            },
            address,
            items: validatedItems,
            subtotal,
            deliveryCharge,
            total,
            paymentMethod,
            paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
            status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
            deliverySlot,
            statusHistory: [{
                status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
                timestamp: new Date()
            }]
        });

        await order.save();

        // Create or update customer record
        try {
            const customerRecord = await Customer.findOrCreate(
                customer.phone,
                customer.name,
                customer.email
            );

            // Add address if not exists
            const addressExists = customerRecord.addresses.some(
                addr => addr.pincode === address.pincode &&
                        addr.houseNo === address.houseNo
            );

            if (!addressExists) {
                await customerRecord.addAddress(address);
            }

            // Record order
            await customerRecord.recordOrder(order._id, total);
        } catch (customerError) {
            // Non-critical error, log but don't fail order
            console.error('Error updating customer record:', customerError);
        }

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

        const order = await Order.findOne({ orderId });

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

        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled
        const cancellableStatuses = ['pending', 'confirmed'];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel order with status: ${order.status}`
            });
        }

        // Update order status
        await order.updateStatus('cancelled', reason || 'Cancelled by customer');

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: {
                orderId: order.orderId,
                status: order.status
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

        const orders = await Order.findByPhone(phone);

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders.map(order => ({
                orderId: order.orderId,
                status: order.status,
                total: order.total,
                itemCount: order.items.length,
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
