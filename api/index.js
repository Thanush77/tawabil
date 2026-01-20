/**
 * Vercel Serverless Function Wrapper
 * Wraps the Express app for Vercel's serverless environment
 */

const app = require('../server/server.js');

module.exports = app;
