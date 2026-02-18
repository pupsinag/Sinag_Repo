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
    logging: console.log, // keep for now
  }
);

module.exports = sequelize;

