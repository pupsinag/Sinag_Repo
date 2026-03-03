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
    logging: console.log,
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 25000, // MATCHED: Keep below MySQL wait_timeout (28800s)
      evict: 25000, // MATCHED: Validate every 25 seconds to keep alive
      validate: true
    },
    dialectOptions: {
      connectTimeout: 20000, // MATCHED: MySQL connect_timeout is 20 seconds
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
