/* eslint-env node */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbHost = (process.env.DB_HOST || '127.0.0.1').trim();
const dbPort = Number((process.env.DB_PORT || '3306').trim());
const dbName = (process.env.DB_NAME || '').trim();
const dbUser = (process.env.DB_USER || '').trim();
const dbPassword = process.env.DB_PASSWORD_B64
  ? Buffer.from(process.env.DB_PASSWORD_B64, 'base64').toString('utf8')
  : (process.env.DB_PASSWORD || '');

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: false, // Changed to false in production (was console.log)
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 5000,   // ✅ REDUCED: Close idle conns after 5s (was 10s, MySQL kills at 20s)
      evict: 5000   // ✅ REDUCED: Validate every 5s (was 15s, prevents stale conns)
    },
    dialectOptions: {
      connectTimeout: 60000,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      // ✅ NEW: Keepalive for mysql2 to prevent idle socket closure
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    },
    // ✅ NEW: Retry on connection errors (handles dropped connections gracefully)
    retry: {
      max: 3,
      match: [
        /SequelizeConnectionError/i,
        /SequelizeConnectionTimedOutError/i,
        /SequelizeHostNotFoundError/i,
        /SequelizeConnectionRefusedError/i,
        /PROTOCOL_CONNECTION_LOST/i,
        /PROTOCOL_PACKETS_OUT_OF_ORDER/i,
        /ECONNRESET/i,
        /ETIMEDOUT/i,
        /EHOSTUNREACH/i,
        /ENOTFOUND/i
      ]
    }
  }
);

// ✅ OPTIONAL: Try to increase session timeouts (may fail on shared hosting)
// This is a best-effort approach — if Hostinger blocks it, it will just be logged
sequelize.afterConnect(async (connection) => {
  try {
    await connection.query("SET SESSION wait_timeout=120");
    await connection.query("SET SESSION interactive_timeout=120");
    console.log('✅ Session timeouts increased to 120s (if allowed)');
  } catch (err) {
    // Hostinger likely blocks this — it's okay, pool timings will handle it
    console.log('ℹ️ Could not set session timeouts (expected on shared hosting):', err.message.split('\n')[0]);
  }
});

module.exports = sequelize;

