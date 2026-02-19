/**
 * Connection Health Check Middleware
 * Validates and restores database connections before critical operations
 */

const sequelize = require('../config/database');

const ensureDBConnection = async (req, res, next) => {
  try {
    // Check if connection is still valid
    await sequelize.authenticate();
    next();
  } catch (error) {
    console.warn('⚠️ [DB Health Check] Connection failed, attempting recovery...');
    console.warn(`   Error: ${error.message}`);

    try {
      // Try to close the pool and restart
      if (sequelize.connectionManager.pool) {
        await sequelize.connectionManager.pool.drain();
      }

      // Authenticate again
      await sequelize.authenticate();
      console.log('✅ [DB Health Check] Connection restored');
      next();
    } catch (recoveryError) {
      console.error('❌ [DB Health Check] Recovery failed:', recoveryError.message);
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again in a moment.',
        error: 'DB_CONNECTION_FAILED'
      });
    }
  }
};

const ensureDBConnectionAsync = async (req, res, next) => {
  try {
    // Check if connection is still valid with timeout
    const checkPromise = sequelize.authenticate();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 5000)
    );

    await Promise.race([checkPromise, timeoutPromise]);
    next();
  } catch (error) {
    console.warn('⚠️ [DB Async Check] Connection issue detected');
    
    // Don't block on recovery, let it happen in background
    sequelize.authenticate().catch(err => {
      console.error('❌ [DB Async Check] Background recovery failed:', err.message);
    });

    // Continue with request anyway - it will fail if DB is truly down
    next();
  }
};

module.exports = {
  ensureDBConnection,
  ensureDBConnectionAsync
};
