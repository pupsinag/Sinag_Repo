/* eslint-env node */
'use strict';

/**
 * Migration 020: Add file_content storage to intern_documents
 * 
 * This migration:
 * 1. Adds file_content (LONGBLOB) column to store files in the database
 * 2. Adds file_mime_type column to store MIME type information
 * 3. Optionally migrates existing files from filesystem to database
 * 
 * Benefits:
 * - Files persist across redeployments
 * - No need for persistent storage/volumes
 * - Automatic file recovery after rebuild
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

async function runMigration() {
  try {
    console.log('\n========== MIGRATION 020: Add file content storage ==========\n');

    // Step 1: Run SQL migration
    console.log('Step 1️⃣ : Running SQL migration to add columns...');
    const sqlPath = path.join(__dirname, '020_add_file_content_to_intern_documents.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL by semicolon and execute each statement
    const statements = sqlContent.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sequelize.query(statement.trim());
          console.log('  ✅ Executed:', statement.substring(0, 60) + '...');
        } catch (err) {
          // Ignore column already exists errors
          if (err.message.includes('Duplicate column') || err.message.includes('already exists')) {
            console.log('  ⓘ  Column already exists (safe to ignore)');
          } else {
            throw err;
          }
        }
      }
    }

    console.log('✅ SQL migration completed\n');

    // Step 2: Migrate existing files to database
    console.log('Step 2️⃣ : Migrating existing files from filesystem to database...');
    
    const { InternDocuments } = require('../models');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('  ⓘ  No uploads directory found (nothing to migrate)');
    } else {
      const files = fs.readdirSync(uploadsDir);
      
      if (files.length === 0) {
        console.log('  ⓘ  No files found in uploads directory');
      } else {
        console.log(`  📁 Found ${files.length} file(s) to check for migration`);
        
        let migratedCount = 0;
        let skippedCount = 0;

        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          
          // Skip if not a file
          if (!fs.statSync(filePath).isFile()) {
            continue;
          }

          try {
            // Find corresponding database record
            const doc = await InternDocuments.findOne({
              where: { file_path: file }
            });

            if (!doc) {
              console.log(`  ⚠️  No database record for file: ${file}`);
              skippedCount++;
              continue;
            }

            // Skip if already has content in database
            if (doc.file_content && doc.file_content.length > 0) {
              console.log(`  ✓ Already in database: ${file}`);
              skippedCount++;
              continue;
            }

            // Read file and determine MIME type
            const fileContent = fs.readFileSync(filePath);
            const ext = path.extname(file).toLowerCase();
            const mimeTypes = {
              '.pdf': 'application/pdf',
              '.doc': 'application/msword',
              '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.xls': 'application/vnd.ms-excel',
              '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };
            const fileMimeType = mimeTypes[ext] || 'application/octet-stream';

            // Update record with file content
            await doc.update({
              file_content: fileContent,
              file_mime_type: fileMimeType,
            });

            console.log(`  📦 Migrated: ${file} (${(fileContent.length / 1024).toFixed(2)} KB)`);
            migratedCount++;
          } catch (err) {
            console.error(`  ❌ Error migrating ${file}:`, err.message);
            skippedCount++;
          }
        }

        console.log(`\n  Summary: ${migratedCount} migrated, ${skippedCount} skipped/failed`);
      }
    }

    console.log('\n✅ Migration 020 completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Future file uploads will be automatically stored in the database');
    console.log('   2. Existing files in filesystem can now be deleted (backup first!)');
    console.log('   3. Files will now persist across redeployments\n');

    return true;
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = runMigration;
