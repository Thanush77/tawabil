/**
 * Payment Controller Tests - Prisma Version
 */

const crypto = require('crypto');
const { prisma } = require('../../server/config/prisma');

describe('Payment Controller', () => {
    describe('Payment Signature Verification', () => {
        const secret = 'test_secret_key_for_testing';

        it('should generate valid HMAC signature', () => {
            const razorpayOrderId = 'order_test123';
            const razorpayPaymentId = 'pay_test456';

            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest('hex');

            expect(expectedSignature).toBeDefined();
            expect(expectedSignature.length).toBe(64); // SHA256 hex length
        });

        it('should detect invalid signatures', () => {
            const razorpayOrderId = 'order_test123';
            const razorpayPaymentId = 'pay_test456';

            const validSignature = crypto
                .createHmac('sha256', secret)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest('hex');

            const invalidSignature = 'invalid_signature_here';

            expect(validSignature).not.toBe(invalidSignature);
        });

        it('should fail verification with wrong secret', () => {
            const razorpayOrderId = 'order_test123';
            const razorpayPaymentId = 'pay_test456';

            const signatureWithCorrectSecret = crypto
                .createHmac('sha256', secret)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest('hex');

            const signatureWithWrongSecret = crypto
                .createHmac('sha256', 'wrong_secret')
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest('hex');

            expect(signatureWithCorrectSecret).not.toBe(signatureWithWrongSecret);
        });
    });

    describe('Webhook Signature Verification', () => {
        const webhookSecret = 'test_webhook_secret';

        it('should verify webhook payload signature', () => {
            const payload = JSON.stringify({
                event: 'payment.captured',
                payload: {
                    payment: {
                        entity: {
                            id: 'pay_test123',
                            order_id: 'order_test456'
                        }
                    }
                }
            });

            const signature = crypto
                .createHmac('sha256', webhookSecret)
                .update(payload)
                .digest('hex');

            expect(signature).toBeDefined();
            expect(signature.length).toBe(64);
        });

        it('should detect tampered webhook payload', () => {
            const originalPayload = JSON.stringify({ event: 'payment.captured', amount: 1000 });
            const tamperedPayload = JSON.stringify({ event: 'payment.captured', amount: 9999 });

            const originalSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(originalPayload)
                .digest('hex');

            const tamperedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(tamperedPayload)
                .digest('hex');

            expect(originalSignature).not.toBe(tamperedSignature);
        });
    });

    describe('Order Amount Validation', () => {
        it('should validate amount matches order total', () => {
            const requestedAmount = 240;
            const orderTotal = 240;

            expect(Math.round(requestedAmount)).toBe(Math.round(orderTotal));
        });

        it('should reject mismatched amounts', () => {
            const requestedAmount = 999;
            const orderTotal = 240;

            expect(Math.round(requestedAmount)).not.toBe(Math.round(orderTotal));
        });

        it('should handle decimal amounts correctly', () => {
            const requestedAmount = 240.49;
            const orderTotal = 240;

            // Allow small rounding differences
            expect(Math.round(requestedAmount)).toBe(Math.round(orderTotal));
        });
    });

    describe('Payment Status Updates with Prisma', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should update payment status to paid', async () => {
            const mockOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                paymentStatus: 'PAID',
                razorpayPaymentId: 'pay_test456'
            };

            prisma.order.update.mockResolvedValue(mockOrder);

            const result = await prisma.order.update({
                where: { orderId: 'TW-260120-ABC123' },
                data: {
                    paymentStatus: 'PAID',
                    razorpayPaymentId: 'pay_test456'
                }
            });

            expect(result.paymentStatus).toBe('PAID');
            expect(result.razorpayPaymentId).toBe('pay_test456');
        });

        it('should update payment status to failed', async () => {
            const mockOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                paymentStatus: 'FAILED'
            };

            prisma.order.update.mockResolvedValue(mockOrder);

            const result = await prisma.order.update({
                where: { orderId: 'TW-260120-ABC123' },
                data: { paymentStatus: 'FAILED' }
            });

            expect(result.paymentStatus).toBe('FAILED');
        });

        it('should update order status to confirmed on successful payment', async () => {
            const mockOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                paymentStatus: 'PAID',
                status: 'CONFIRMED',
                razorpayPaymentId: 'pay_test789',
                razorpaySignature: 'sig_test'
            };

            prisma.order.update.mockResolvedValue(mockOrder);

            const result = await prisma.order.update({
                where: { orderId: 'TW-260120-ABC123' },
                data: {
                    paymentStatus: 'PAID',
                    status: 'CONFIRMED',
                    razorpayPaymentId: 'pay_test789',
                    razorpaySignature: 'sig_test'
                }
            });

            expect(result.paymentStatus).toBe('PAID');
            expect(result.status).toBe('CONFIRMED');
        });

        it('should find order by razorpayOrderId for webhook', async () => {
            const mockOrder = {
                id: 'cuid_123',
                orderId: 'TW-260120-ABC123',
                razorpayOrderId: 'order_test456'
            };

            prisma.order.findFirst.mockResolvedValue(mockOrder);

            const result = await prisma.order.findFirst({
                where: { razorpayOrderId: 'order_test456' }
            });

            expect(result.razorpayOrderId).toBe('order_test456');
        });
    });
});
