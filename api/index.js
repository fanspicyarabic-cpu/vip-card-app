/**
 * VIP Card App - Vercel Serverless Function Gateway
 * Handles all REST API routes and Telegram Webhooks 24/7 on Vercel
 */

const app = require('../server');

// Export the configured Express app as the Vercel Serverless Function handler
module.exports = app;
