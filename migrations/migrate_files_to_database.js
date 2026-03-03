#!/usr/bin/env node
/**
 * Migration: Move Filesystem-Stored Files to Database
 * 
 * Purpose:
 * - Ensures all documents are persisted in the database (survives redeploys)
 * - Documents stored in uploads/ folder are backed up to file_content column
 * - This prevents data loss when Hostinger redeploys the application
 * 
 * Run: node migrations/migrate_files_to_database.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../models');
const { InternDocuments } = db;
const sequelize = db.sequelize;

async function migrateFilesToDatabase() {
  try {
    console.log('🚀 Starting file migration to database...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('ℹ️  No uploads directory found - nothing to migrate');
      process.exit(0);
    }

    // Get all documents in database
    const documents = await InternDocuments.findAll({
      attributes: ['id', 'file_path', 'file_content', 'file_name', 'document_type']
    });

    console.log(`📚 Found ${documents.length} documents in database\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const doc of documents) {
      try {
        // Skip if already has file_content
        if (doc.file_content && doc.file_content.length > 0) {
          console.log(`⏭️  [${doc.id}] Already in database: ${doc.file_name}`);
          skippedCount++;
          continue;
        }

        // Try to find file in filesystem
        if (!doc.file_path) {
          console.log(`⚠️  [${doc.id}] No file_path stored: ${doc.file_name || 'UNKNOWN'}`);
          skippedCount++;
          continue;
        }

        const filePath = path.join(uploadsDir, doc.file_path);
        
        if (!fs.existsSync(filePath)) {
          console.log(`❌ [${doc.id}] File not found on disk: ${doc.file_path}`);
          errorCount++;
          continue;
        }

        // Read file content
        const fileContent = fs.readFileSync(filePath);
        
        // Update database
        await doc.update({
          file_content: fileContent
        });

        console.log(`✅ [${doc.id}] Migrated to database: ${doc.file_name} (${fileContent.length} bytes)`);
        migratedCount++;

      } catch (docError) {
        console.error(`❌ [${doc.id}] Migration error:`, docError.message);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Migration Complete:`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Already persisted: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

    if (migratedCount > 0) {
      console.log('💾 All documents are now persisted in the database!');
      console.log('📌 Future uploads will not create filesystem files.');
      console.log('🔄 Documents will survive redeploys.\n');
    }

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateFilesToDatabase();
