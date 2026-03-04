const sequelize = require('./config/database');
const db = require('./models');

async function createAllTables() {
  try {
    // Authenticate connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync all models with the database (creates tables from models)
    await sequelize.sync({ alter: false });
    console.log('✅ All tables created successfully!');

    await sequelize.close();
  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  }
}

createAllTables();
