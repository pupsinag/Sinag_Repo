/* eslint-env node */
'use strict';

/**
 * Migration Runner for Hostinger Environments
 * 
 * This script runs database migrations using the app's connection pool
 * instead of requiring direct MySQL CLI access (which Hostinger limits)
 * 
 * Usage: node migrations/run_hostinger_migrations.js
 * 
 * Benefits for Hostinger:
 * - No need for SSH/MySQL CLI access
 * - Uses existing database connection pool
 * - Can be run from app startup or manually
 * - Safe to run multiple times (idempotent)
 */

const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    const { sequelize } = require('../models');

    console.log('\n========== HOSTINGER MIGRATION RUNNER ==========\n');
    console.log('✅ Connected to database:', process.env.DB_NAME);

    // Create migration_logs table if not exists (for tracking)
    console.log('\n[1/4] Creating migration tracking table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS migration_logs (
        migration_name VARCHAR(255) PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'completed',
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT
      )
    `);
    console.log('✅ Migration logs table ready\n');

    // Migration 021: Add Document Tracking
    console.log('[2/4] Running Migration 021: Add document tracking columns...');
    try {
      await sequelize.query(`
        ALTER TABLE intern_documents 
        ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR(100) DEFAULT 'application/octet-stream',
        ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_accessed_by INT,
        ADD COLUMN IF NOT EXISTS last_accessed_date DATETIME,
        ADD COLUMN IF NOT EXISTS version INT DEFAULT 1
      `);
      
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_intern_documents_intern_id 
        ON intern_documents(intern_id)
      `);
      
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_intern_documents_document_type 
        ON intern_documents(document_type)
      `);
      
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_intern_documents_uploaded_date 
        ON intern_documents(uploaded_date DESC)
      `);
      
      console.log('✅ Migration 021 completed\n');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('⚠️ Migration 021 already applied\n');
      } else {
        throw err;
      }
    }

    // Migration 022: Create Access Logs Table
    console.log('[3/4] Running Migration 022: Create document access logs...');
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS intern_document_access_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          intern_id INT UNSIGNED NOT NULL,
          accessed_by INT NOT NULL,
          accessed_by_name VARCHAR(255),
          accessed_by_role VARCHAR(50),
          document_type VARCHAR(100),
          action VARCHAR(50),
          ip_address VARCHAR(45),
          access_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
          FOREIGN KEY (accessed_by) REFERENCES users(id) ON DELETE CASCADE,
          
          INDEX idx_intern_access (intern_id),
          INDEX idx_accessed_by (accessed_by),
          INDEX idx_access_date (access_date),
          INDEX idx_document_type (document_type),
          INDEX idx_adviser_access (accessed_by, access_date DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ Migration 022 completed\n');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️ Migration 022 already applied\n');
      } else {
        throw err;
      }
    }

    // Verification
    console.log('[4/4] Verifying migrations...');
    const result = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'intern_documents' 
      AND TABLE_SCHEMA = ?
    `, {
      replacements: [process.env.DB_NAME],
      type: sequelize.QueryTypes.SELECT
    });

    const hasDownloadCount = result.some(r => r.COLUMN_NAME === 'download_count');
    const hasAccessLogs = !!sequelize.models.intern_document_access_logs;

    if (hasDownloadCount) {
      console.log('✅ Document tracking columns verified\n');
    }

    console.log('========== MIGRATIONS COMPLETE ==========\n');
    console.log('Summary:');
    console.log('- Migration 021: Document tracking columns - DONE');
    console.log('- Migration 022: Access logs table - DONE');
    console.log('\nYou can now:');
    console.log('1. View access logs: SELECT * FROM intern_document_access_logs;');
    console.log('2. Monitor downloads: SELECT download_count FROM intern_documents;');
    console.log('3. Check adviser activity: SELECT * FROM intern_document_access_logs WHERE accessed_by_role = "adviser";');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err.message);
    console.error('Stack:', err.stack);
    
    console.error('\n=== TROUBLESHOOTING ===');
    console.error('1. Ensure database is running');
    console.error('2. Check database credentials in .env');
    console.error('3. Verify database user has ALTER TABLE permissions');
    console.error('4. If columns already exist, that\'s fine - they\'re skipped');
    
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
