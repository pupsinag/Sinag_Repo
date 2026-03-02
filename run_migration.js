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
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 5000,
      evict: 5000
    },
    dialectOptions: {
      connectTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    }
  }
);

// Read and execute the migration file
const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

sequelize.query(migrationContent)
  .then(() => {
    console.log('Migration executed successfully!');
    // ✅ IMPORTANT: Close connection pool properly
    return sequelize.close();
  })
  .then(() => {
    console.log('✅ Connection closed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error executing migration:', err);
    // ✅ IMPORTANT: Close connection even on error
    sequelize.close().then(() => {
      process.exit(1);
    }).catch(() => {
      process.exit(1);
    });
  });
