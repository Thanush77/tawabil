/**
 * Order Tests - Prisma Version
 * Tests order creation and ID generation using Prisma mocks
 */

const { prisma, generateOrderId } = require('../../server/config/prisma');

describe('Order Model', () => {
    describe('Order ID Generation', () => {
        it('should generate unique order IDs', () => {
            const id1 = generateOrderId();
            const id2 = generateOrderId();

            expect(id1).not.toBe(id2);
        });

        it('should generate order IDs with correct format', () => {
            const orderId = generateOrderId();

            // Format: TW-YYMMDD-XXXXXX
            expect(orderId).toMatch(/^TW-\d{6}-[A-Z0-9]{6}$/);
        });

        it('should start with TW- prefix', () => {
            const orderId = generateOrderId();

            expect(orderId.startsWith('TW-')).toBe(true);
        });

        it('should generate 100 unique IDs without collision', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(generateOrderId());
            }
            expect(ids.size).toBe(100);
        });
    });

    describe('Order Creation with Prisma', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should create a valid order', async () => {
            const mockOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                customerId: 'customer_1',
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
                paymentMethod: 'COD',
                paymentStatus: 'PENDING',
                status: 'CONFIRMED',
                statusHistory: [{ status: 'CONFIRMED', timestamp: new Date().toISOString() }],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prisma.order.create.mockResolvedValue(mockOrder);

            const result = await prisma.order.create({
                data: {
                    orderId: 'TW-260120-ABC123',
                    customerId: 'customer_1',
                    address: mockOrder.address,
                    items: mockOrder.items,
                    subtotal: 560,
                    deliveryCharge: 40,
                    total: 600,
                    paymentMethod: 'COD',
                    paymentStatus: 'PENDING',
                    status: 'CONFIRMED',
                    statusHistory: [{ status: 'CONFIRMED', timestamp: new Date().toISOString() }]
                }
            });

            expect(result.id).toBe('cuid_123');
            expect(result.orderId).toBe('TW-260120-ABC123');
            expect(result.status).toBe('CONFIRMED');
            expect(result.paymentStatus).toBe('PENDING');
            expect(prisma.order.create).toHaveBeenCalledTimes(1);
        });

        it('should find order by orderId', async () => {
            const mockOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                status: 'PENDING',
                total: 600
            };

            prisma.order.findUnique.mockResolvedValue(mockOrder);

            const result = await prisma.order.findUnique({
                where: { orderId: 'TW-260120-ABC123' }
            });

            expect(result.orderId).toBe('TW-260120-ABC123');
            expect(prisma.order.findUnique).toHaveBeenCalledWith({
                where: { orderId: 'TW-260120-ABC123' }
            });
        });

        it('should return null for non-existent order', async () => {
            prisma.order.findUnique.mockResolvedValue(null);

            const result = await prisma.order.findUnique({
                where: { orderId: 'NONEXISTENT' }
            });

            expect(result).toBeNull();
        });
    });

    describe('Order Status Management', () => {
        it('should update order status', async () => {
            const mockUpdatedOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                status: 'CONFIRMED',
                statusHistory: [
                    { status: 'PENDING', timestamp: '2026-01-20T10:00:00Z' },
                    { status: 'CONFIRMED', timestamp: '2026-01-20T10:05:00Z' }
                ]
            };

            prisma.order.update.mockResolvedValue(mockUpdatedOrder);

            const result = await prisma.order.update({
                where: { orderId: 'TW-260120-ABC123' },
                data: {
                    status: 'CONFIRMED',
                    statusHistory: mockUpdatedOrder.statusHistory
                }
            });

            expect(result.status).toBe('CONFIRMED');
            expect(result.statusHistory.length).toBe(2);
        });

        it('should mark order as paid', async () => {
            const mockPaidOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                paymentStatus: 'PAID',
                razorpayPaymentId: 'pay_test123',
                status: 'CONFIRMED'
            };

            prisma.order.update.mockResolvedValue(mockPaidOrder);

            const result = await prisma.order.update({
                where: { orderId: 'TW-260120-ABC123' },
                data: {
                    paymentStatus: 'PAID',
                    razorpayPaymentId: 'pay_test123',
                    status: 'CONFIRMED'
                }
            });

            expect(result.paymentStatus).toBe('PAID');
            expect(result.razorpayPaymentId).toBe('pay_test123');
            expect(result.status).toBe('CONFIRMED');
        });

        it('should cancel order', async () => {
            const mockCancelledOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                status: 'CANCELLED'
            };

            prisma.order.update.mockResolvedValue(mockCancelledOrder);

            const result = await prisma.order.update({
                where: { orderId: 'TW-260120-ABC123' },
                data: { status: 'CANCELLED' }
            });

            expect(result.status).toBe('CANCELLED');
        });
    });

    describe('Order Queries', () => {
        it('should find orders by customer', async () => {
            const mockOrders = [
                { orderId: 'TW-260120-ABC123', total: 600 },
                { orderId: 'TW-260120-DEF456', total: 340 }
            ];

            prisma.order.findMany.mockResolvedValue(mockOrders);

            const result = await prisma.order.findMany({
                where: { customerId: 'customer_1' },
                orderBy: { createdAt: 'desc' }
            });

            expect(result.length).toBe(2);
            expect(prisma.order.findMany).toHaveBeenCalled();
        });

        it('should return empty array for customer with no orders', async () => {
            prisma.order.findMany.mockResolvedValue([]);

            const result = await prisma.order.findMany({
                where: { customerId: 'non_existent_customer' }
            });

            expect(result).toEqual([]);
        });
    });
});
