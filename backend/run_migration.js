const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Get database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: console.log,
  }
);

// Read and execute the migration file
const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

sequelize.query(migrationContent)
  .then(() => {
    console.log('Migration executed successfully!');
    sequelize.close();
  })
  .catch(err => {
    console.error('Error executing migration:', err);
    sequelize.close();
  });
