/**
 * Tawabil Spices - Express Server
 * Backend API for cart and checkout system
 * Using Prisma 7 with PostgreSQL
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDatabase, disconnectDatabase } = require('./config/prisma');
const { initSentry, captureError } = require('./config/sentry');

// Import routes
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');

// Initialize Express app
const app = express();

// Initialize Sentry (must be first)
const sentry = initSentry(app);

// Sentry request handler (must be first middleware)
app.use(sentry.requestHandler);

// Connect to Prisma PostgreSQL
connectDatabase();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Tawabil API',
        database: 'Prisma PostgreSQL'
    });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Sentry error handler (must be before custom error handler)
app.use(sentry.errorHandler);

// Global error handler
app.use((err, req, res, next) => {
    // Log error in development
    if (process.env.NODE_ENV !== 'production') {
        console.error('Error:', err);
    }

    // Capture error to Sentry for 500 errors
    if (!err.status || err.status >= 500) {
        captureError(err, {
            extra: {
                path: req.path,
                method: req.method,
                body: req.body
            }
        });
    }

    // Prisma error handling
    if (err.code === 'P2002') {
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry found'
        });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({
            success: false,
            message: 'Record not found'
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error'
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🌿 Tawabil Spices API Server                   ║
║                                                   ║
║   Server running on port ${PORT}                     ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   Database: Prisma PostgreSQL                     ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
        `);
    });
}

module.exports = app;
