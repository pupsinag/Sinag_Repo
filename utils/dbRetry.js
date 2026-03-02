/**
 * Database Retry Utility
 * 
 * Provides automatic retry logic for transient database connection failures.
 * Use this around actual query calls in controllers to handle temporary DB unavailability
 * gracefully without requiring a global health check middleware.
 * 
 * Example:
 *   const { withDbRetry } = require('../utils/dbRetry');
 *   const user = await withDbRetry(() => User.findOne({ where: { email } }), 2);
 */

/**
 * Wraps a database query with automatic retry on transient failures.
 * 
 * @param {Function} queryFn - Async function that performs the DB query
 * @param {number} maxRetries - Maximum number of retries (default: 2, so 3 total attempts)
 * @returns {Promise} Result of the query
 * @throws {Error} If all retries fail
 */
async function withDbRetry(queryFn, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;

      // Extract error code from Sequelize or MySQL error
      const errorCode = error?.original?.code || error?.code || '';
      const errorMsg = error?.message || '';

      // List of retryable errors (connection issues, not validation/logic errors)
      const isRetryable =
        /PROTOCOL_CONNECTION_LOST|QUERY_INTERRUPTED|ECONNRESET|ETIMEDOUT|ER_TOO_MANY_CONNECTIONS|EHOSTUNREACH|ENOTFOUND/i.test(
          errorCode + errorMsg
        );

      if (!isRetryable || attempt === maxRetries) {
        // Not retryable or out of retries — throw the error
        throw error;
      }

      // Exponential backoff: 100ms, 200ms, 400ms (if 2 retries)
      const delayMs = 100 * Math.pow(2, attempt);
      console.log(
        `⚠️ [DB Retry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`,
        `(Error: ${errorCode || errorMsg})`
      );

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Wraps multiple database queries that should all succeed or all fail together.
 * Useful for operations that span multiple queries.
 * 
 * @param {Function} transactionFn - Async function performing multiple queries
 * @param {number} maxRetries - Maximum retries
 * @returns {Promise} Result of the transaction
 */
async function withDbRetryTransaction(transactionFn, maxRetries = 2) {
  return withDbRetry(transactionFn, maxRetries);
}

module.exports = {
  withDbRetry,
  withDbRetryTransaction
};
