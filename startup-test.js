#!/usr/bin/env node
/**
 * Simple Startup Test - Check what happens when app.js tries to start
 * Run: node startup-test.js
 */

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║     PUPSINAG STARTUP TEST - Replicating app.js         ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

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

// Try to authenticate database
async function test() {
  try {
    console.log('\nStep 3: Testing database authentication...');
    await sequelize.authenticate();
    console.log('  ✅ Database authenticated');
    
    console.log('\nStep 4: Loading models...');
    const db = require('./models');
    console.log(`  ✅ Models loaded (${Object.keys(db).length - 2} models)`);
    
    console.log('\nStep 5: Syncing database...');
    await sequelize.sync({ alter: false });
    console.log('  ✅ Database synced');
    
    console.log('\nStep 6: Checking for missing columns...');
    const addMissingColumns = require('./utils/addMissingColumns');
    await addMissingColumns();
    console.log('  ✅ Schema checked');
    
    console.log('\n' + '╔════════════════════════════════════════════════════════╗');
    console.log('║              ✅ STARTUP TEST SUCCESSFUL                  ║');
    console.log('║    Your app.js should start without issues              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
  } catch (err) {
    console.log('\n  ❌ Error during startup:\n');
    console.log(`  Error Type: ${err.constructor.name}`);
    console.log(`  Message: ${err.message}`);
    if (err.original) {
      console.log(`  MySQL Error: ${err.original.message}`);
      console.log(`  MySQL Code: ${err.original.code}`);
    }
    if (err.stack) {
      console.log(`\n  Full Stack:\n${err.stack}`);
    }
    console.log('\n' + '╔════════════════════════════════════════════════════════╗');
    console.log('║              ❌ STARTUP FAILED                           ║');
    console.log('║     app.js will crash on Hostinger with this error      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    process.exit(1);
  }
}

test();
