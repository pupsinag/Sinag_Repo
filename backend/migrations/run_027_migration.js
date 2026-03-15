#!/usr/bin/env node
/* eslint-env node */

/**
 * Script to run Migration 027: Fix Supervisor Email Constraint
 * 
 * Usage: node run_027_migration.js
 */

const require_ = require;
const path = require_('path');
const db = require_('../models');

const migration = require_('./027_fix_supervisor_email_constraint.js');

const runMigration = async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('Running Migration 027: Fix Supervisor Email Constraint');
    console.log('='.repeat(60) + '\n');

    // Ensure database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection verified\n');

    // Run migration
    await migration.up();

    console.log('\n✅ Migration 027 completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration 027 failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run the migration
runMigration();
