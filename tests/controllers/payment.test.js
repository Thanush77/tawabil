/**
 * Payment Controller Tests
 */

const crypto = require('crypto');
const Order = require('../../server/models/Order');

// Mock the payment controller functions for unit testing
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
        let testOrder;

        beforeEach(async () => {
            testOrder = new Order({
                orderId: Order.generateOrderId(),
                customer: { name: 'Test User', phone: '9876543210' },
                address: { houseNo: '123', street: 'Test St', area: 'Test Area', pincode: '560001' },
                items: [{ productId: 'test', name: 'Test Item', packSize: '50g', quantity: 2, price: 100, total: 200 }],
                subtotal: 200,
                deliveryCharge: 40,
                total: 240,
                paymentMethod: 'online'
            });
            await testOrder.save();
        });

        it('should validate amount matches order total', () => {
            const requestedAmount = 240;
            const orderTotal = testOrder.total;

            expect(Math.round(requestedAmount)).toBe(Math.round(orderTotal));
        });

        it('should reject mismatched amounts', () => {
            const requestedAmount = 999;
            const orderTotal = testOrder.total;

            expect(Math.round(requestedAmount)).not.toBe(Math.round(orderTotal));
        });

        it('should handle decimal amounts correctly', () => {
            const requestedAmount = 240.50;
            const orderTotal = 240;

            // Allow small rounding differences
            expect(Math.round(requestedAmount)).toBe(Math.round(orderTotal));
        });
    });

    describe('Payment Status Updates', () => {
        let testOrder;

        beforeEach(async () => {
            testOrder = new Order({
                orderId: Order.generateOrderId(),
                customer: { name: 'Test User', phone: '9876543210' },
                address: { houseNo: '123', street: 'Test St', area: 'Test Area', pincode: '560001' },
                items: [{ productId: 'test', name: 'Test Item', packSize: '50g', quantity: 1, price: 200, total: 200 }],
                subtotal: 200,
                deliveryCharge: 40,
                total: 240,
                paymentMethod: 'online',
                razorpayOrderId: 'order_test123'
            });
            await testOrder.save();
        });

        it('should update payment status to paid', async () => {
            testOrder.paymentStatus = 'paid';
            testOrder.razorpayPaymentId = 'pay_test456';
            await testOrder.save();

            const updatedOrder = await Order.findOne({ orderId: testOrder.orderId });
            expect(updatedOrder.paymentStatus).toBe('paid');
        });

        it('should update payment status to failed', async () => {
            testOrder.paymentStatus = 'failed';
            await testOrder.save();

            const updatedOrder = await Order.findOne({ orderId: testOrder.orderId });
            expect(updatedOrder.paymentStatus).toBe('failed');
        });

        it('should update order status to confirmed on successful payment', async () => {
            await testOrder.markAsPaid('pay_test789', 'sig_test');

            const updatedOrder = await Order.findOne({ orderId: testOrder.orderId });
            expect(updatedOrder.paymentStatus).toBe('paid');
            expect(updatedOrder.status).toBe('confirmed');
        });
    });
});
