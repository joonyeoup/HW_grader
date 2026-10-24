/**
 * Authentication Middleware
 * Verify API keys and JWT tokens
 */

const jwt = require('jsonwebtoken');

// Simple in-memory user store (should match auth.js - in production use shared database)
const users = new Map();

/**
 * Middleware to authenticate API key
 */
function authenticateToken(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  // Find user by API key
  let foundUser = null;
  for (const [email, user] of users.entries()) {
    if (user.apiKey === apiKey) {
      foundUser = { email, ...user };
      break;
    }
  }

  if (!foundUser) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Check if user has exceeded their limits
  if (foundUser.usage.totalRequests >= foundUser.limits.requestsPerDay) {
    return res.status(429).json({
      error: 'Daily request limit exceeded',
      limit: foundUser.limits.requestsPerDay,
      plan: foundUser.plan,
      message: 'Upgrade to premium for unlimited requests'
    });
  }

  // Attach user to request
  req.user = foundUser;
  next();
}

/**
 * Export user store so routes can access it
 */
function getUserStore() {
  return users;
}

module.exports = {
  authenticateToken,
  getUserStore
};
