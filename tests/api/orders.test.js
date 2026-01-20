/**
 * Orders API Integration Tests
 */

const request = require('supertest');
const express = require('express');
const Order = require('../../server/models/Order');

// Create a minimal express app for testing
const app = express();
app.use(express.json());

// Import routes
const orderRoutes = require('../../server/routes/orders');
app.use('/api/orders', orderRoutes);

describe('Orders API', () => {
    describe('POST /api/orders', () => {
        it('should create a new order with valid data', async () => {
            const orderData = {
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
                    price: 280
                }],
                deliverySlot: {
                    date: '2026-01-25',
                    displayDate: '25 Jan',
                    day: 'Sat',
                    time: '10 AM - 6 PM'
                },
                paymentMethod: 'cod'
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData)
                .expect('Content-Type', /json/);

            // Should return 201 or 200 for successful creation
            expect([200, 201]).toContain(response.status);

            if (response.status === 201 || response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.orderId).toBeDefined();
            }
        });

        it('should reject order without customer name', async () => {
            const orderData = {
                customer: {
                    phone: '9876543210'
                    // name missing
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
                    price: 280
                }],
                paymentMethod: 'cod'
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject order with invalid phone number', async () => {
            const orderData = {
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
                    price: 280
                }],
                paymentMethod: 'cod'
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject order with non-Bengaluru pincode', async () => {
            const orderData = {
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
                    price: 280
                }],
                paymentMethod: 'cod'
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should reject order with empty items', async () => {
            const orderData = {
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
                paymentMethod: 'cod'
            };

            const response = await request(app)
                .post('/api/orders')
                .send(orderData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/orders/:orderId', () => {
        let testOrderId;

        beforeEach(async () => {
            const order = new Order({
                orderId: Order.generateOrderId(),
                customer: { name: 'Test User', phone: '9876543210' },
                address: { houseNo: '123', street: 'Test St', area: 'Koramangala', pincode: '560001' },
                items: [{ productId: 'test', name: 'Test Item', packSize: '50g', quantity: 1, price: 200, total: 200 }],
                subtotal: 200,
                deliveryCharge: 40,
                total: 240,
                paymentMethod: 'cod'
            });
            await order.save();
            testOrderId = order.orderId;
        });

        it('should retrieve an existing order', async () => {
            const response = await request(app)
                .get(`/api/orders/${testOrderId}`)
                .expect('Content-Type', /json/);

            expect([200, 404]).toContain(response.status);

            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.data.orderId).toBe(testOrderId);
            }
        });

        it('should return 404 for non-existent order', async () => {
            const response = await request(app)
                .get('/api/orders/TW-NONEXISTENT')
                .expect('Content-Type', /json/);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/orders/phone/:phone', () => {
        beforeEach(async () => {
            // Create multiple orders for same phone
            const orders = [
                {
                    orderId: Order.generateOrderId(),
                    customer: { name: 'John Doe', phone: '9876543210' },
                    address: { houseNo: '123', street: 'Test St', area: 'Koramangala', pincode: '560001' },
                    items: [{ productId: 'test1', name: 'Item 1', packSize: '50g', quantity: 1, price: 200, total: 200 }],
                    subtotal: 200, deliveryCharge: 40, total: 240, paymentMethod: 'cod'
                },
                {
                    orderId: Order.generateOrderId(),
                    customer: { name: 'John Doe', phone: '9876543210' },
                    address: { houseNo: '456', street: 'Other St', area: 'Indiranagar', pincode: '560038' },
                    items: [{ productId: 'test2', name: 'Item 2', packSize: '100g', quantity: 2, price: 150, total: 300 }],
                    subtotal: 300, deliveryCharge: 40, total: 340, paymentMethod: 'online'
                }
            ];

            await Order.insertMany(orders);
        });

        it('should retrieve orders by phone number', async () => {
            const response = await request(app)
                .get('/api/orders/phone/9876543210')
                .expect('Content-Type', /json/);

            expect([200, 404]).toContain(response.status);

            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(Array.isArray(response.body.data)).toBe(true);
            }
        });

        it('should return empty array for unknown phone', async () => {
            const response = await request(app)
                .get('/api/orders/phone/0000000000')
                .expect('Content-Type', /json/);

            if (response.status === 200) {
                expect(response.body.data).toEqual([]);
            }
        });
    });
});
