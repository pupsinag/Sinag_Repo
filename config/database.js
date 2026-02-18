/* eslint-env node */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbHost = (process.env.DB_HOST || 'localhost').trim();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: dbHost === '127.0.0.1' ? 'localhost' : dbHost,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: console.log, // keep for now
  }
);

module.exports = sequelize;

