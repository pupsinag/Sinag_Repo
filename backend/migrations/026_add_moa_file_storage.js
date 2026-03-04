/* eslint-env node */
'use strict';

/**
 * Migration: Add MOA file storage columns to companies table
 * Allows storing MOA files directly in the database instead of filesystem
 */

const sequelize = require('../config/database');

async function addMOAFileColumns() {
  try {
    console.log('\n========== MIGRATION: Add MOA File Storage ==========\n');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check and add moaFile_content column
    console.log('\n📝 Adding moaFile_content column...');
    try {
      await sequelize.query(`
        ALTER TABLE companies 
        ADD COLUMN IF NOT EXISTS moaFile_content LONGBLOB COMMENT 'Stores the MOA file content in binary format'
      `);
      console.log('✅ moaFile_content column added/verified');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('✅ moaFile_content column already exists');
      } else {
        throw err;
      }
    }

    // Check and add moaFile_mime_type column
    console.log('📝 Adding moaFile_mime_type column...');
    try {
      await sequelize.query(`
        ALTER TABLE companies 
        ADD COLUMN IF NOT EXISTS moaFile_mime_type VARCHAR(100) DEFAULT 'application/octet-stream' COMMENT 'MIME type of the MOA file'
      `);
      console.log('✅ moaFile_mime_type column added/verified');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('✅ moaFile_mime_type column already exists');
      } else {
        throw err;
      }
    }

    // Verify the columns exist
    console.log('\n🔍 Verifying columns...');
    const result = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'companies' 
      AND TABLE_SCHEMA = DATABASE()
      AND COLUMN_NAME IN ('moaFile_content', 'moaFile_mime_type')
    `);

    if (result[0].length === 2) {
      console.log('✅ All columns verified successfully');
      console.log('   • moaFile_content: LONGBLOB');
      console.log('   • moaFile_mime_type: VARCHAR(100)');
    } else {
      console.warn('⚠️  Some columns may not exist');
    }

    await sequelize.close();
    console.log('\n✅ Migration completed!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  }
}

addMOAFileColumns();
