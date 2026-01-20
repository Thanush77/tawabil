/**
 * Order Model Tests
 */

const Order = require('../../server/models/Order');

describe('Order Model', () => {
    describe('Order ID Generation', () => {
        it('should generate unique order IDs', () => {
            const id1 = Order.generateOrderId();
            const id2 = Order.generateOrderId();

            expect(id1).not.toBe(id2);
        });

        it('should generate order IDs with correct format', () => {
            const orderId = Order.generateOrderId();

            // Format: TW-YYMMDD-XXXXXX
            expect(orderId).toMatch(/^TW-\d{6}-[A-Z0-9]{6}$/);
        });

        it('should start with TW- prefix', () => {
            const orderId = Order.generateOrderId();

            expect(orderId.startsWith('TW-')).toBe(true);
        });

        it('should generate 100 unique IDs without collision', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(Order.generateOrderId());
            }
            expect(ids.size).toBe(100);
        });
    });

    describe('Order Creation', () => {
        it('should create a valid order', async () => {
            const orderData = {
                orderId: Order.generateOrderId(),
                customer: {
                    name: 'John Doe',
                    phone: '9876543210',
                    email: 'john@example.com'
                },
                address: {
                    houseNo: '123',
                    street: 'Main Street',
                    area: 'Koramangala',
                    pincode: '560001',
                    city: 'Bengaluru'
                },
                items: [{
                    productId: 'cardamom',
                    name: 'Green Cardamom',
                    packSize: '50g',
                    quantity: 2,
                    price: 280,
                    total: 560
                }],
                subtotal: 560,
                deliveryCharge: 40,
                total: 600,
                paymentMethod: 'cod'
            };

            const order = new Order(orderData);
            const savedOrder = await order.save();

            expect(savedOrder._id).toBeDefined();
            expect(savedOrder.orderId).toBe(orderData.orderId);
            expect(savedOrder.customer.name).toBe('John Doe');
            expect(savedOrder.status).toBe('pending');
            expect(savedOrder.paymentStatus).toBe('pending');
        });

        it('should require customer phone number', async () => {
            const orderData = {
                orderId: Order.generateOrderId(),
                customer: {
                    name: 'John Doe'
                    // phone missing
                },
                address: {
                    houseNo: '123',
                    street: 'Main Street',
                    area: 'Koramangala',
                    pincode: '560001'
                },
                items: [{
                    productId: 'cardamom',
                    name: 'Green Cardamom',
                    packSize: '50g',
                    quantity: 1,
                    price: 280,
                    total: 280
                }],
                subtotal: 280,
                deliveryCharge: 40,
                total: 320,
                paymentMethod: 'cod'
            };

            const order = new Order(orderData);
            await expect(order.save()).rejects.toThrow();
        });

        it('should validate phone number format', async () => {
            const orderData = {
                orderId: Order.generateOrderId(),
                customer: {
                    name: 'John Doe',
                    phone: '123' // Invalid phone
                },
                address: {
                    houseNo: '123',
                    street: 'Main Street',
                    area: 'Koramangala',
                    pincode: '560001'
                },
                items: [{
                    productId: 'cardamom',
                    name: 'Green Cardamom',
                    packSize: '50g',
                    quantity: 1,
                    price: 280,
                    total: 280
                }],
                subtotal: 280,
                deliveryCharge: 40,
                total: 320,
                paymentMethod: 'cod'
            };

            const order = new Order(orderData);
            await expect(order.save()).rejects.toThrow();
        });

        it('should only accept Bengaluru pincodes', async () => {
            const orderData = {
                orderId: Order.generateOrderId(),
                customer: {
                    name: 'John Doe',
                    phone: '9876543210'
                },
                address: {
                    houseNo: '123',
                    street: 'Main Street',
                    area: 'Some Area',
                    pincode: '400001' // Mumbai pincode
                },
                items: [{
                    productId: 'cardamom',
                    name: 'Green Cardamom',
                    packSize: '50g',
                    quantity: 1,
                    price: 280,
                    total: 280
                }],
                subtotal: 280,
                deliveryCharge: 40,
                total: 320,
                paymentMethod: 'cod'
            };

            const order = new Order(orderData);
            await expect(order.save()).rejects.toThrow();
        });

        it('should require at least one item', async () => {
            const orderData = {
                orderId: Order.generateOrderId(),
                customer: {
                    name: 'John Doe',
                    phone: '9876543210'
                },
                address: {
                    houseNo: '123',
                    street: 'Main Street',
                    area: 'Koramangala',
                    pincode: '560001'
                },
                items: [], // Empty items
                subtotal: 0,
                deliveryCharge: 0,
                total: 0,
                paymentMethod: 'cod'
            };

            const order = new Order(orderData);
            await expect(order.save()).rejects.toThrow();
        });
    });

    describe('Order Status Management', () => {
        let order;

        beforeEach(async () => {
            order = new Order({
                orderId: Order.generateOrderId(),
                customer: {
                    name: 'John Doe',
                    phone: '9876543210'
                },
                address: {
                    houseNo: '123',
                    street: 'Main Street',
                    area: 'Koramangala',
                    pincode: '560001'
                },
                items: [{
                    productId: 'cardamom',
                    name: 'Green Cardamom',
                    packSize: '50g',
                    quantity: 1,
                    price: 280,
                    total: 280
                }],
                subtotal: 280,
                deliveryCharge: 40,
                total: 320,
                paymentMethod: 'cod'
            });
            await order.save();
        });

        it('should update order status', async () => {
            await order.updateStatus('confirmed', 'Order confirmed');

            const updatedOrder = await Order.findOne({ orderId: order.orderId });
            expect(updatedOrder.status).toBe('confirmed');
            expect(updatedOrder.statusHistory.length).toBeGreaterThan(0);
        });

        it('should track status history', async () => {
            await order.updateStatus('confirmed');
            await order.updateStatus('processing');
            await order.updateStatus('dispatched');

            const updatedOrder = await Order.findOne({ orderId: order.orderId });
            expect(updatedOrder.statusHistory.length).toBeGreaterThanOrEqual(3);
        });

        it('should mark order as paid', async () => {
            await order.markAsPaid('pay_test123', 'sig_test123');

            const updatedOrder = await Order.findOne({ orderId: order.orderId });
            expect(updatedOrder.paymentStatus).toBe('paid');
            expect(updatedOrder.razorpayPaymentId).toBe('pay_test123');
            expect(updatedOrder.status).toBe('confirmed');
        });
    });

    describe('Order Queries', () => {
        beforeEach(async () => {
            // Create multiple orders
            const orders = [
                {
                    orderId: Order.generateOrderId(),
                    customer: { name: 'John Doe', phone: '9876543210' },
                    address: { houseNo: '123', street: 'Main St', area: 'Koramangala', pincode: '560001' },
                    items: [{ productId: 'cardamom', name: 'Cardamom', packSize: '50g', quantity: 1, price: 280, total: 280 }],
                    subtotal: 280, deliveryCharge: 40, total: 320, paymentMethod: 'cod'
                },
                {
                    orderId: Order.generateOrderId(),
                    customer: { name: 'John Doe', phone: '9876543210' },
                    address: { houseNo: '456', street: 'Park Ave', area: 'Indiranagar', pincode: '560038' },
                    items: [{ productId: 'pepper', name: 'Black Pepper', packSize: '100g', quantity: 2, price: 150, total: 300 }],
                    subtotal: 300, deliveryCharge: 40, total: 340, paymentMethod: 'online'
                },
                {
                    orderId: Order.generateOrderId(),
                    customer: { name: 'Jane Smith', phone: '9123456789' },
                    address: { houseNo: '789', street: 'Lake Rd', area: 'JP Nagar', pincode: '560078' },
                    items: [{ productId: 'cloves', name: 'Cloves', packSize: '25g', quantity: 1, price: 220, total: 220 }],
                    subtotal: 220, deliveryCharge: 40, total: 260, paymentMethod: 'cod'
                }
            ];

            await Order.insertMany(orders);
        });

        it('should find orders by phone number', async () => {
            const orders = await Order.findByPhone('9876543210');

            expect(orders.length).toBe(2);
            orders.forEach(order => {
                expect(order.customer.phone).toBe('9876543210');
            });
        });

        it('should return empty array for unknown phone', async () => {
            const orders = await Order.findByPhone('0000000000');

            expect(orders).toEqual([]);
        });
    });

    describe('Pre-save Middleware', () => {
        it('should calculate item totals on save', async () => {
            const order = new Order({
                orderId: Order.generateOrderId(),
                customer: { name: 'John Doe', phone: '9876543210' },
                address: { houseNo: '123', street: 'Main St', area: 'Koramangala', pincode: '560001' },
                items: [
                    { productId: 'cardamom', name: 'Cardamom', packSize: '50g', quantity: 2, price: 280, total: 0 },
                    { productId: 'pepper', name: 'Pepper', packSize: '100g', quantity: 1, price: 150, total: 0 }
                ],
                subtotal: 0,
                deliveryCharge: 40,
                total: 0,
                paymentMethod: 'cod'
            });

            await order.save();

            expect(order.items[0].total).toBe(560); // 2 * 280
            expect(order.items[1].total).toBe(150); // 1 * 150
            expect(order.subtotal).toBe(710); // 560 + 150
            expect(order.total).toBe(750); // 710 + 40
        });
    });
});
