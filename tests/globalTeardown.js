/**
 * Jest Global Teardown
 * Stops MongoDB Memory Server after all tests
 */

module.exports = async () => {
    console.log('\\nStopping MongoDB Memory Server...');

    if (global.__MONGO_SERVER__) {
        await global.__MONGO_SERVER__.stop();
        console.log('MongoDB Memory Server stopped.');
    }
};
