#!/usr/bin/env node

/**
 * Script to run the adviser linking migration
 * Usage: node run_migration_020.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { runMigration } = require('./migrations/020_link_interns_to_advisers');
const { sequelize } = require('./models');

async function main() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Run the migration
    await runMigration();

    // Close connection
    await sequelize.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
