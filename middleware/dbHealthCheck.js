/**
 * Connection Health Check Middleware
 * 
 * ⚠️ IMPORTANT: This middleware should be used sparingly and with rate-limiting.
 * Calling sequelize.authenticate() or heavy checks on every request can create
 * unnecessary load and connection overhead on shared hosting.
 * 
 * Better approach: handle DB errors in individual route handlers with retry logic.
 */

const sequelize = require('../config/database');

let lastCheck = 0;
let lastCheckOk = true;

/**
 * Lightweight DB check using SELECT 1 (reuses pool connection)
 * Much cheaper than authenticate() which opens/validates connections
 */
async function checkDbHealth() {
  try {
    await sequelize.query('SELECT 1');
    return true;
  } catch (error) {
    console.error(
      '❌ [DB Health] Check failed:',
      error?.original?.code || error.message
    );
    return false;
  }
}

/**
 * Rate-limited middleware that checks DB at most once per 10 seconds.
 * ℹ️ Consider removing this middleware entirely and handling DB errors
 * in individual route handlers instead.
 * 
 * @param {number} intervalMs - Minimum milliseconds between checks (default: 10000)
 */
const ensureDBConnection = (intervalMs = 10000) => {
  return async (req, res, next) => {
    const now = Date.now();

    // Only check at most once every `intervalMs` milliseconds
    if (now - lastCheck < intervalMs) {
      // If last check passed, proceed
      if (lastCheckOk) return next();

      // If last check failed and we're still within the interval, fail fast
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again in a moment.',
        error: 'DB_UNAVAILABLE'
      });
    }

    // Time to check again
    lastCheck = now;

    try {
      // Use Promise.race to add a timeout (3 seconds)
      const isHealthy = await Promise.race([
        checkDbHealth(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB check timeout')), 3000)
        )
      ]);

      lastCheckOk = isHealthy ?? true;

      if (!isHealthy) {
        return res.status(503).json({
          success: false,
          message: 'Database connection unavailable. Please try again in a moment.',
          error: 'DB_UNAVAILABLE'
        });
      }

      return next();
    } catch (error) {
      lastCheckOk = false;
      console.error('❌ [DB Health Check] Failed:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again in a moment.',
        error: 'DB_UNAVAILABLE'
      });
    }
  };
};

/**
 * Utility function for adding retry logic around queries.
 * Use this inside route handlers to automatically retry on transient failures.
 * 
 * Example:
 *   const user = await withDbRetry(() => User.findOne({ where: { email } }), 2);
 */
async function withDbRetry(queryFn, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;

      // Only retry on connection/timeout errors, not validation errors
      const errorCode = error?.original?.code;
      const isRetryable =
        /PROTOCOL_CONNECTION_LOST|QUERY_INTERRUPTED|ECONNRESET|ETIMEDOUT|ER_TOO_MANY_CONNECTIONS/i.test(
          errorCode || error.message
        );

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 100ms, 200ms, etc.
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }

  throw lastError;
}

module.exports = {
  ensureDBConnection,
  withDbRetry,
  checkDbHealth
};
