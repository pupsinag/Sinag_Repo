/**
 * Migration 024 Runner - Add photo_content column to intern_daily_logs
 * Stores actual image data in database for persistence across redeployments
 */

const sequelize = require('../config/database');

async function runMigration() {
  try {
    console.log('🔄 [Migration 024] Starting...\n');

    // Step 1: Add photo_content column
    console.log('📝 Step 1: Adding photo_content column...');
    try {
      await sequelize.query(
        `ALTER TABLE \`intern_daily_logs\` 
         ADD COLUMN \`photo_content\` JSON COMMENT 'Array of image binary data (BLOB) for persistence across redeployments' AFTER \`photo_path\``
      );
      console.log('✅ photo_content column added successfully\n');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('⚠️  photo_content column already exists, skipping...\n');
      } else {
        throw err;
      }
    }

    // Step 2: Add indexes
    console.log('📝 Step 2: Adding indexes for performance...');
    try {
      await sequelize.query(
        `ALTER TABLE \`intern_daily_logs\` 
         ADD INDEX \`idx_intern_id_date\` (\`intern_id\`, \`log_date\`)`
      );
      console.log('✅ Index idx_intern_id_date added');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('⚠️  Index idx_intern_id_date already exists, skipping...');
      } else {
        throw err;
      }
    }

    try {
      await sequelize.query(
        `ALTER TABLE \`intern_daily_logs\` 
         ADD INDEX \`idx_log_date\` (\`log_date\`)`
      );
      console.log('✅ Index idx_log_date added\n');
    } catch (err) {
      if (err.message.includes('Duplicate key name')) {
        console.log('⚠️  Index idx_log_date already exists, skipping...\n');
      } else {
        throw err;
      }
    }

    console.log('✅ [Migration 024] Completed successfully!');
    console.log('📊 intern_daily_logs table now has persistent photo storage');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Migration 024] FAILED:');
    console.error(error.message);
    process.exit(1);
  }
}

runMigration();
