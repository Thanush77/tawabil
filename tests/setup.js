/**
 * Jest Test Setup
 * Configures test environment for Prisma tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = 'test_secret_key_for_testing';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

// Mock Prisma client for testing
jest.mock('../server/config/prisma', () => {
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

// Clear all mocks after each test
afterEach(() => {
    jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
    // No cleanup needed for mocked Prisma
}, 30000);
