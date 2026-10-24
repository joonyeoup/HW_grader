/**
 * Usage Tracking Middleware
 * Track API usage per user
 */

const { getUserStore } = require('./auth');

/**
 * Middleware to track usage
 */
function trackUsage(req, res, next) {
  const users = getUserStore();

  // Get original res.json
  const originalJson = res.json.bind(res);

  // Override res.json to track usage after response
  res.json = function(data) {
    // Track usage
    const user = users.get(req.user.email);
    if (user) {
      user.usage.totalRequests += 1;
      user.usage.lastRequest = new Date();

      // Track tokens if available in response
      if (data.tokensUsed) {
        user.usage.totalTokens += data.tokensUsed;
      }

      console.log(`Usage update for ${req.user.email}:`, {
        totalRequests: user.usage.totalRequests,
        totalTokens: user.usage.totalTokens,
        limit: user.limits.requestsPerDay
      });
    }

    // Call original res.json
    return originalJson(data);
  };

  next();
}

module.exports = {
  trackUsage
};
