/**
 * Jest Global Setup
 * Starts MongoDB Memory Server before all tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
    console.log('\\nStarting MongoDB Memory Server...');

    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Store the server instance and URI globally
    global.__MONGO_SERVER__ = mongoServer;
    process.env.MONGODB_URI = mongoUri;

    console.log(`MongoDB Memory Server started at: ${mongoUri}`);
};
