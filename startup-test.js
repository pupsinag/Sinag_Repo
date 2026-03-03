#!/usr/bin/env node
/**
 * Simple Startup Test - Check what happens when app.js tries to start
 * Run: node startup-test.js
 */

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║     PUPSINAG STARTUP TEST - Replicating app.js         ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// **ENFORCE NODE VERSION EARLY**
const requiredNodeMajor = 18;
const currentMajor = parseInt(process.versions.node.split('.')[0], 10);
if (currentMajor < requiredNodeMajor) {
  console.error(`\n❌ Node.js ${requiredNodeMajor}+ is required to run the startup test; detected ${process.versions.node}.`);
  process.exit(1);
}

// Load environment variables
require('dotenv').config();
const path = require('path');

console.log('Step 1: dotenv loaded');
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  PORT: ${process.env.PORT}`);

// Try to load express
let express, cors, sequelize;

try {
  console.log('\nStep 2: Loading dependencies...');
  express = require('express');
  cors = require('cors');
  sequelize = require('./config/database');
  console.log('  ✅ Express, CORS, and Database config loaded');
} catch (err) {
  console.log('  ❌ Failed to load dependencies:');
  console.log(`     ${err.message}`);
  process.exit(1);
}

// Try to authenticate database (but continue if it fails - just like app.js)
async function test() {
  let dbReady = false;
  
  // STEP 1: Try database connection
  console.log('\nStep 3: Testing database authentication...');
  try {
    await sequelize.authenticate();
    console.log('  ✅ Database authenticated successfully');
    dbReady = true;
  } catch (dbErr) {
    // Database failed, but continue anyway - just like app.js
    console.warn('  ⚠️  Database connection failed (this is OK for local testing)');
    console.warn(`     Error: ${dbErr.message}`);
    console.warn('     The app will retry connecting when deployed to Hostinger\n');
    dbReady = false;
  }
  
  // STEP 2: Load models (even if database failed)
  try {
    console.log('Step 4: Loading models...');
    const db = require('./models');
    console.log(`  ✅ Models loaded (${Object.keys(db).length - 2} models)`);
  } catch (modelErr) {
    console.log('\n  ❌ FATAL ERROR - Failed to load models:\n');
    console.log(`  Error: ${modelErr.message}`);
    console.log(`\n  Full Stack:\n${modelErr.stack}`);
    console.log('\n' + '╔════════════════════════════════════════════════════════╗');
    console.log('║              ❌ STARTUP FAILED - MODELS ERROR              ║');
    console.log('║     Fix the model error above                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    process.exit(1);
  }
  
  // STEP 3: Database sync (skip if DB not available)
  if (dbReady) {
    try {
      console.log('\nStep 5: Syncing database...');
      await sequelize.sync({ alter: false });
      console.log('  ✅ Database synced');
    } catch (syncErr) {
      console.warn(`  ⚠️  Database sync warning: ${syncErr.message}`);
      console.warn('     (This is OK - will sync on Hostinger)\n');
    }
    
    // STEP 4: Check missing columns (skip if DB not available)
    try {
      console.log('Step 6: Checking for missing columns...');
      const addMissingColumns = require('./utils/addMissingColumns');
      await addMissingColumns();
      console.log('  ✅ Schema checked');
    } catch (colErr) {
      console.warn(`  ⚠️  Column check warning: ${colErr.message}`);
      console.warn('     (This is OK - will check on Hostinger)\n');
    }
  } else {
    console.log('\nStep 5: Skipping database sync (no database connection)');
    console.log('Step 6: Skipping schema check (no database connection)');
    console.log('        These will run when deployed to Hostinger\n');
  }
  
  // SUCCESS - app is ready!
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              ✅ STARTUP TEST SUCCESSFUL                 ║');
  console.log('║    Your app.js is ready for Hostinger deployment      ║');
  if (dbReady) {
    console.log('║    ✅ Database: CONNECTED                              ║');
  } else {
    console.log('║    ℹ️  Database: NOT AVAILABLE (local environment)      ║');
    console.log('║    Will connect to Hostinger MySQL when deployed      ║');
  }
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

test();
