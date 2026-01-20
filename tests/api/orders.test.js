/**
 * Orders API Integration Tests - Prisma Version
 * Tests order API endpoints with mocked Prisma client
 */

const request = require('supertest');
const express = require('express');

// Mock Prisma before importing routes
jest.mock('../../server/config/prisma', () => {
    const mockPrisma = {
        customer: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        product: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        order: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        $queryRaw: jest.fn(),
        $disconnect: jest.fn(),
    };

    return {
        prisma: mockPrisma,
        connectDatabase: jest.fn().mockResolvedValue(true),
        disconnectDatabase: jest.fn().mockResolvedValue(undefined),
        generateOrderId: jest.fn(() => {
            const now = new Date();
            const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let randomPart = '';
            for (let i = 0; i < 6; i++) {
                randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return `TW-${dateStr}-${randomPart}`;
        }),
    };
});

const { prisma, generateOrderId } = require('../../server/config/prisma');

// Create a minimal express app for testing
const app = express();
app.use(express.json());

// Import routes after mocking
const orderRoutes = require('../../server/routes/orders');
app.use('/api/orders', orderRoutes);

describe('Orders API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/orders', () => {
        it('should create a new order with valid data', async () => {
            const mockCustomer = {
                id: 'customer_1',
                name: 'John Doe',
                phone: '9876543210'
            };

            const mockOrder = {
                id: 'order_id_1',
                orderId: 'TW-260120-ABC123',
                customerId: 'customer_1',
                status: 'CONFIRMED',
                paymentStatus: 'PENDING',
                total: 600
            };

            prisma.customer.findUnique.mockResolvedValue(mockCustomer);
            prisma.order.create.mockResolvedValue(mockOrder);

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

            // Should return 201 for successful creation
            expect([200, 201]).toContain(response.status);
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
        it('should retrieve an existing order', async () => {
            const mockOrder = {
                id: 'order_id_1',
                orderId: 'TW-260120-ABC123',
                customerId: 'customer_1',
                customer: { name: 'Test User', phone: '9876543210' },
                status: 'CONFIRMED',
                total: 240
            };

            prisma.order.findUnique.mockResolvedValue(mockOrder);

            const response = await request(app)
                .get('/api/orders/TW-260120-ABC123')
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.orderId).toBe('TW-260120-ABC123');
        });

        it('should return 404 for non-existent order', async () => {
            prisma.order.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/orders/TW-NONEXISTENT')
                .expect('Content-Type', /json/);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/orders/phone/:phone', () => {
        it('should retrieve orders by phone number', async () => {
            const mockCustomer = {
                id: 'customer_1',
                phone: '9876543210'
            };

            const mockOrders = [
                { orderId: 'TW-260120-ABC123', total: 240, items: [{}], createdAt: new Date() },
                { orderId: 'TW-260120-DEF456', total: 340, items: [{}, {}], createdAt: new Date() }
            ];

            prisma.customer.findUnique.mockResolvedValue(mockCustomer);
            prisma.order.findMany.mockResolvedValue(mockOrders);

            const response = await request(app)
                .get('/api/orders/phone/9876543210')
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.count).toBe(2);
        });

        it('should return empty array for unknown phone', async () => {
            prisma.customer.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/orders/phone/0000000000')
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
        });

        it('should reject invalid phone number format', async () => {
            const response = await request(app)
                .get('/api/orders/phone/123') // Invalid phone
                .expect('Content-Type', /json/);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/orders/:orderId/cancel', () => {
        it('should cancel a pending order', async () => {
            const mockOrder = {
                id: 'order_id_1',
                orderId: 'TW-260120-ABC123',
                status: 'PENDING',
                statusHistory: []
            };

            const mockCancelledOrder = {
                ...mockOrder,
                status: 'CANCELLED'
            };

            prisma.order.findUnique.mockResolvedValue(mockOrder);
            prisma.order.update.mockResolvedValue(mockCancelledOrder);

            const response = await request(app)
                .post('/api/orders/TW-260120-ABC123/cancel')
                .send({ reason: 'Customer request' })
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('CANCELLED');
        });

        it('should reject cancellation of dispatched order', async () => {
            const mockOrder = {
                id: 'order_id_1',
                orderId: 'TW-260120-ABC123',
                status: 'DISPATCHED'
            };

            prisma.order.findUnique.mockResolvedValue(mockOrder);

            const response = await request(app)
                .post('/api/orders/TW-260120-ABC123/cancel')
                .send({ reason: 'Changed mind' })
                .expect('Content-Type', /json/);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});
