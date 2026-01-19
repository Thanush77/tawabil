/**
 * Cart Controller
 * Handles cart validation and calculation
 */

const { getProductPrice } = require('./productController');

// Configuration
const DELIVERY_CHARGE = 40;
const FREE_DELIVERY_ABOVE = 500;
const MIN_ORDER_AMOUNT = 200;

/**
 * Validate cart items
 * POST /api/cart/validate
 */
exports.validateCart = async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        const validatedItems = [];
        const errors = [];

        for (const item of items) {
            const { productId, packSize, quantity } = item;

            // Get current price from product data
            const currentPrice = getProductPrice(productId, packSize);

            if (currentPrice === null) {
                errors.push({
                    productId,
                    packSize,
                    error: 'Product or pack size not found'
                });
                continue;
            }

            // Check if price has changed
            const priceChanged = item.price !== currentPrice;

            validatedItems.push({
                ...item,
                price: currentPrice,
                priceChanged,
                originalPrice: item.price,
                total: currentPrice * quantity
            });
        }

        // Calculate totals
        const subtotal = validatedItems.reduce((sum, item) => sum + item.total, 0);
        const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_CHARGE;
        const total = subtotal + deliveryCharge;

        res.status(200).json({
            success: true,
            valid: errors.length === 0,
            items: validatedItems,
            errors,
            summary: {
                itemCount: validatedItems.reduce((sum, item) => sum + item.quantity, 0),
                subtotal,
                deliveryCharge,
                total,
                isFreeDelivery: deliveryCharge === 0,
                meetsMinOrder: subtotal >= MIN_ORDER_AMOUNT,
                freeDeliveryRemaining: Math.max(0, FREE_DELIVERY_ABOVE - subtotal)
            }
        });

    } catch (error) {
        console.error('Error validating cart:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating cart'
        });
    }
};

/**
 * Calculate cart totals
 * POST /api/cart/calculate
 */
exports.calculateTotals = async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid cart data'
            });
        }

        let subtotal = 0;
        let itemCount = 0;

        for (const item of items) {
            const { productId, packSize, quantity } = item;

            // Get current price
            const price = getProductPrice(productId, packSize);

            if (price !== null) {
                subtotal += price * quantity;
                itemCount += quantity;
            }
        }

        const deliveryCharge = subtotal >= FREE_DELIVERY_ABOVE ? 0 : (subtotal > 0 ? DELIVERY_CHARGE : 0);
        const total = subtotal + deliveryCharge;

        res.status(200).json({
            success: true,
            summary: {
                itemCount,
                subtotal,
                deliveryCharge,
                total,
                isFreeDelivery: deliveryCharge === 0 && subtotal > 0,
                meetsMinOrder: subtotal >= MIN_ORDER_AMOUNT,
                freeDeliveryRemaining: Math.max(0, FREE_DELIVERY_ABOVE - subtotal),
                minOrderAmount: MIN_ORDER_AMOUNT
            }
        });

    } catch (error) {
        console.error('Error calculating totals:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating totals'
        });
    }
};
