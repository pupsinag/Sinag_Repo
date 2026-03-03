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
    logging: false, // Disable verbose logging in production
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000, // ✅ CRITICAL: Return connection after 10 seconds of inactivity (prevents idle timeout)
      evict: 10000, // ✅ Validate connection every 10 seconds
      validate: true, // ✅ Run query before giving connection to user
      handleDisconnects: true // ✅ Reconnect on disconnection
    },
    dialectOptions: {
      connectTimeout: 20000,
      keepAliveInitialDelaySeconds: 0,
      enableKeepAlive: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      timezone: '+00:00'
    }
  }
);

module.exports = sequelize;
