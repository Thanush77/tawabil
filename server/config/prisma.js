/**
 * Prisma Client Configuration for Prisma 7
 * Uses PostgreSQL adapter for direct database connection
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;
let pool;

// Create Prisma client with PostgreSQL adapter
const createPrismaClient = () => {
    // Create a PostgreSQL connection pool
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Create the Prisma adapter
    const adapter = new PrismaPg(pool);

    // Create PrismaClient with the adapter
    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'production'
            ? ['error', 'warn']
            : ['error', 'warn'],
    });
};

if (process.env.NODE_ENV === 'production') {
    prisma = createPrismaClient();
} else {
    // In development, use a global variable to preserve the client across hot reloads
    if (!global.__prisma) {
        global.__prisma = createPrismaClient();
    }
    prisma = global.__prisma;
}

// Connect to database
async function connectDatabase() {
    try {
        // Test the connection with a simple query
        await prisma.$queryRaw`SELECT 1`;
        console.log('Connected to Prisma PostgreSQL database');
        return true;
    } catch (error) {
        console.error('Failed to connect to database:', error.message);
        return false;
    }
}

// Disconnect from database
async function disconnectDatabase() {
    await prisma.$disconnect();
    if (pool) {
        await pool.end();
    }
    console.log('Disconnected from Prisma database');
}

// Generate unique order ID
function generateOrderId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `TW-${dateStr}-${randomPart}`;
}

module.exports = {
    prisma,
    connectDatabase,
    disconnectDatabase,
    generateOrderId
};
