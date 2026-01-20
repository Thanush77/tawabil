/**
 * Sentry Error Monitoring Configuration
 *
 * Setup Instructions:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a new Node.js project
 * 3. Copy your DSN and set it as SENTRY_DSN environment variable
 * 4. The integration will automatically capture errors
 */

const Sentry = require('@sentry/node');

// Check if Sentry is configured
const isSentryConfigured = () => {
    return !!process.env.SENTRY_DSN;
};

// Initialize Sentry
const initSentry = (app) => {
    if (!isSentryConfigured()) {
        console.log('Sentry DSN not configured. Error monitoring disabled.');
        return {
            requestHandler: (req, res, next) => next(),
            errorHandler: (err, req, res, next) => next(err),
            captureException: () => {},
            captureMessage: () => {}
        };
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',

        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Release tracking (set via CI/CD)
        release: process.env.SENTRY_RELEASE || 'tawabil@1.0.0',

        // Filter sensitive data
        beforeSend(event, hint) {
            // Remove sensitive headers
            if (event.request && event.request.headers) {
                delete event.request.headers.authorization;
                delete event.request.headers.cookie;
            }

            // Remove sensitive data from request body
            if (event.request && event.request.data) {
                const data = typeof event.request.data === 'string'
                    ? JSON.parse(event.request.data)
                    : event.request.data;

                // Mask sensitive fields
                if (data.customer) {
                    if (data.customer.phone) data.customer.phone = '****' + data.customer.phone.slice(-4);
                    if (data.customer.email) data.customer.email = '****@****.***';
                }
                if (data.address) {
                    data.address = { city: data.address.city, pincode: data.address.pincode };
                }

                event.request.data = JSON.stringify(data);
            }

            return event;
        },

        // Ignore certain errors
        ignoreErrors: [
            'Network request failed',
            'Failed to fetch',
            'Load failed',
            // Rate limiting errors
            'Too Many Requests'
        ]
    });

    console.log('Sentry error monitoring initialized');

    return {
        requestHandler: Sentry.Handlers.requestHandler(),
        errorHandler: Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                // Only report 500 errors to Sentry
                return error.status >= 500 || !error.status;
            }
        }),
        captureException: Sentry.captureException.bind(Sentry),
        captureMessage: Sentry.captureMessage.bind(Sentry)
    };
};

// Capture custom error with context
const captureError = (error, context = {}) => {
    if (!isSentryConfigured()) return;

    Sentry.withScope((scope) => {
        // Add custom context
        if (context.user) {
            scope.setUser({
                phone: context.user.phone ? '****' + context.user.phone.slice(-4) : undefined
            });
        }

        if (context.orderId) {
            scope.setTag('orderId', context.orderId);
        }

        if (context.extra) {
            scope.setExtras(context.extra);
        }

        Sentry.captureException(error);
    });
};

// Capture payment errors specifically
const capturePaymentError = (error, orderId, paymentId) => {
    if (!isSentryConfigured()) return;

    Sentry.withScope((scope) => {
        scope.setTag('type', 'payment');
        scope.setTag('orderId', orderId);
        if (paymentId) scope.setTag('paymentId', paymentId);
        scope.setLevel('error');
        Sentry.captureException(error);
    });
};

// Log critical business events
const logCriticalEvent = (message, data = {}) => {
    if (!isSentryConfigured()) return;

    Sentry.withScope((scope) => {
        scope.setLevel('warning');
        scope.setExtras(data);
        Sentry.captureMessage(message);
    });
};

module.exports = {
    initSentry,
    isSentryConfigured,
    captureError,
    capturePaymentError,
    logCriticalEvent
};
