/**
 * OPTIONAL: Migrate old files from disk to database
 * Run this after the main migration to preserve existing files
 * 
 * Usage: node migrate_old_files_to_db.js
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const sequelize = require('./config/database');
const { InternDocuments } = require('./models');

async function migrateOldFiles() {
  try {
    console.log('\n========== MIGRATING OLD FILES TO DATABASE ==========\n');

    const uploadsDir = path.join(__dirname, 'uploads');

    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('ℹ️  No /uploads directory found. Nothing to migrate.\n');
      await sequelize.close();
      process.exit(0);
    }

    // Get all documents in database
    const allDocs = await InternDocuments.findAll({
      attributes: ['id', 'intern_id', 'document_type', 'file_path', 'file_name', 'file_content', 'file_size']
    });

    console.log(`Found ${allDocs.length} document records in database\n`);

    const uploadsPath = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsPath);
    console.log(`Found ${files.length} files in /uploads directory\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of allDocs) {
      // Skip if file_content already exists
      if (doc.file_content && doc.file_content.length > 0) {
        skipped++;
        continue;
      }

      if (!doc.file_path) {
        console.log(`⊘ Skip: Doc ${doc.id} (${doc.document_type}) - No file path`);
        skipped++;
        continue;
      }

      try {
        const filePath = path.join(uploadsPath, doc.file_path);

        // Check if file exists on disk
        if (!fs.existsSync(filePath)) {
          console.log(`❌ Error: File not found on disk - ${doc.file_path}`);
          errors++;
          continue;
        }

        // Read file content
        const fileContent = fs.readFileSync(filePath);
        const fileSize = fileContent.length;

        // Update database record
        await doc.update({
          file_content: fileContent,
          file_size: fileSize
        });

        migrated++;
        console.log(`✅ Migrated: ${doc.file_name} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

      } catch (err) {
        console.error(`❌ Failed to migrate Doc ${doc.id}:`, err.message);
        errors++;
      }
    }

    // Summary
    console.log('\n========== MIGRATION SUMMARY ==========\n');
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`⊘  Skipped (already in DB): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);

    // Calculate total size
    const totalSizeResult = await sequelize.query(
      `SELECT ROUND(SUM(LENGTH(file_content)) / 1024 / 1024, 2) AS total_size FROM intern_documents WHERE file_content IS NOT NULL`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const totalSize = totalSizeResult[0]?.total_size || 0;

    console.log(`\n📊 Total database file storage: ${totalSize} MB\n`);

    if (migrated > 0) {
      console.log('✨ All files have been successfully migrated to the database!');
      console.log('   Files will now persist through Hostinger redeployments.\n');
    } else {
      console.log('ℹ️  No files needed migration (may already be in database).\n');
    }

    await sequelize.close();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ MIGRATION ERROR');
    console.error('Error:', err.message);
    console.error(err.stack);
    
    await sequelize.close();
    process.exit(1);
  }
}

migrateOldFiles();
