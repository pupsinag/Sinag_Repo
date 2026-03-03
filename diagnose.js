#!/usr/bin/env node
/**
 * Hostinger Database Diagnostic Script
 * 
 * This script tests if your database connection is working
 * Run: node diagnose.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function diagnose() {
  console.log('\n🔍 PUPSINAG DATABASE DIAGNOSTIC\n');
  console.log('='.repeat(60));
  
  // 1. Check environment variables
  console.log('\n1️⃣  ENVIRONMENT VARIABLES:');
  console.log('   DB_HOST:', process.env.DB_HOST || '❌ NOT SET');
  console.log('   DB_PORT:', process.env.DB_PORT || '❌ NOT SET');
  console.log('   DB_USER:', process.env.DB_USER || '❌ NOT SET');
  console.log('   DB_NAME:', process.env.DB_NAME || '❌ NOT SET');
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ SET' : '❌ NOT SET');
  
  // Check for required variables
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log(`\n❌ MISSING .env variables: ${missing.join(', ')}`);
    console.log('   Fix your .env file before running tests');
    process.exit(1);
  }
  
  console.log('   ✅ All required variables present\n');
  
  // 2. Test raw MySQL connection
  console.log('2️⃣  TESTING MYSQL CONNECTION:');
  let dbPassword = process.env.DB_PASSWORD.trim();
  // Remove quotes if present
  if ((dbPassword.startsWith('"') && dbPassword.endsWith('"')) ||
      (dbPassword.startsWith("'") && dbPassword.endsWith("'"))) {
    dbPassword = dbPassword.slice(1, -1);
  }
  
  try {
    console.log(`   Connecting to: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: dbPassword,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      connectTimeout: 10000
    });
    
    console.log('   ✅ Connected successfully!\n');
    
    // 3. Check database exists and has tables
    console.log('3️⃣  CHECKING DATABASE CONTENTS:');
    const [databases] = await connection.query('SELECT DATABASE()');
    console.log(`   Current database: ${databases[0]['DATABASE()']}`);
    
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",[process.env.DB_NAME]
    );
    console.log(`   Tables found: ${tables.length}`);
    if (tables.length > 0) {
      tables.forEach(table => {
        console.log(`     - ${table.TABLE_NAME}`);
      });
    } else {
      console.log('   ❌ No tables found in database!');
      console.log('   The database exists but has no tables');
      console.log('   Run: npm run migrate or check migrations');
    }
    console.log('');
    
    // 4. Test sequelize connection
    console.log('4️⃣  TESTING SEQUELIZE CONNECTION:');
    try {
      const sequelize = require('./config/database');
      await sequelize.authenticate();
      console.log('   ✅ Sequelize authenticated!\n');
      
      // 5. Check models
      console.log('5️⃣  CHECKING MODELS:');
      try {
        const db = require('./models');
        console.log(`   ✅ Models loaded: ${Object.keys(db).length - 2} models`);
        Object.keys(db).forEach(key => {
          if (key !== 'sequelize' && key !== 'Sequelize') {
            console.log(`     - ${key}`);
          }
        });
      } catch (modelErr) {
        console.log('   ❌ Failed to load models:', modelErr.message);
      }
    } catch (seqErr) {
      console.log('   ❌ Sequelize failed:', seqErr.message);
      if (seqErr.original) {
        console.log('   MySQL Error:', seqErr.original.message);
      }
    }
    
    await connection.end();
    console.log('\n' + '='.repeat(60));
    console.log('✅ DIAGNOSTIC COMPLETE - Database appears to be working!\n');
    
  } catch (err) {
    console.log(`   ❌ Connection failed!\n`);
    console.log('   Error:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_FOR_USER') {
      console.log('   → Wrong password or user credentials');
      console.log('   → Check .env DB_USER and DB_PASSWORD');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.log('   → Database does not exist');
      console.log('   → Check .env DB_NAME');
    } else if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('   → MySQL server is not running');
      console.log('   → Check Hostinger hPanel > MySQL Databases > Status');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('   → Cannot connect to MySQL server');
      console.log('   → Check host and port in .env');
      console.log('   → Check Hostinger MySQL is active');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('TROUBLESHOOTING STEPS:\n');
    console.log('1. Go to Hostinger hPanel');
    console.log('2. Navigate to: Databases → MySQL Databases');
    console.log('3. Check if your database status shows: ACTIVE');
    console.log('4. If not active, click Activate or Restart');
    console.log('5. Verify credentials:');
    console.log(`   - Database: ${process.env.DB_NAME}`);
    console.log(`   - Username: ${process.env.DB_USER}`);
    console.log(`   - Host: ${process.env.DB_HOST}`);
    console.log(`   - Port: ${process.env.DB_PORT}`);
    console.log('6. Try connecting via phpMyAdmin first');
    console.log('7. If phpMyAdmin works, your credentials are correct\n');
    
    process.exit(1);
  }
}

diagnose();
