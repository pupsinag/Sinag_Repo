const { Sequelize } = require('sequelize');
require('dotenv').config();

async function testConnection() {
  try {
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: '../database.sqlite',
      logging: console.log,
    });

    const [rows] = await sequelize.query('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('Database connection successful! Tables:');
    console.log(rows);
    await sequelize.close();
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

testConnection();
