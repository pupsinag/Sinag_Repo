/* eslint-env node */
/**
 * Fix non-existent photo_path references in database
 * Clears photo_path for any logs that reference files that don't exist on disk
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, InternDailyLog } = require('../models');

const uploadsDir = path.join(__dirname, '../uploads');

async function cleanupBadPhotoPaths() {
  try {
    console.log('\n🔧 Cleaning up bad photo references...\n');

    // Get all logs with photos
    const logsWithPhotos = await InternDailyLog.findAll({
      where: {
        photo_path: {
          [sequelize.Sequelize.Op.not]: null,
        },
      },
    });

    console.log(`📋 Found ${logsWithPhotos.length} logs with photo_path entries\n`);

    if (logsWithPhotos.length === 0) {
      console.log('✅ No logs with photos found. All clean!\n');
      process.exit(0);
    }

    let clearedCount = 0;

    for (const log of logsWithPhotos) {
      // Check if the referenced files actually exist
      let photoPaths = log.photo_path;

      // Handle case where photo_path is a JSON string
      if (typeof photoPaths === 'string') {
        try {
          photoPaths = JSON.parse(photoPaths);
        } catch (e) {
          photoPaths = [photoPaths]; // Treat as single string
        }
      }

      // Ensure it's an array
      if (!Array.isArray(photoPaths)) {
        photoPaths = [photoPaths];
      }

      // Check which files exist
      const existingPhotos = [];
      for (const photoFile of photoPaths) {
        const fullPath = path.join(uploadsDir, photoFile);
        if (fs.existsSync(fullPath)) {
          existingPhotos.push(photoFile);
        } else {
          console.log(
            `   ⚠️  Missing: ${photoFile} (Log ID: ${log.id})`
          );
        }
      }

      // Update the log with only existing photos
      if (existingPhotos.length === 0) {
        // Clear photo_path if no files exist
        await log.update({ photo_path: null });
        console.log(`   ✅ Cleared all photos for Log ID ${log.id}`);
        clearedCount++;
      } else if (existingPhotos.length < photoPaths.length) {
        // Update with only existing photos
        await log.update({ photo_path: existingPhotos });
        console.log(`   ✅ Updated Log ID ${log.id} to keep ${existingPhotos.length} existing photo(s)`);
        clearedCount++;
      }
    }

    console.log(`\n✨ Cleanup complete! ${clearedCount} logs updated\n`);
    console.log('📝 Next steps:');
    console.log('   1. Upload fresh photos via UploadReport component');
    console.log('   2. Photos will be saved with correct filenames');
    console.log('   3. Adviser/Supervisor modals will display them correctly\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  }
}

cleanupBadPhotoPaths();
