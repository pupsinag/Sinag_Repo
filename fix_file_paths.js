/* eslint-env node */
require('dotenv').config();

const { InternDocuments } = require('./models');

async function fixFilePaths() {
  try {
    console.log('🔧 Starting file path fix...\n');

    // Get all documents with file_path
    const allDocs = await InternDocuments.findAll({
      where: {
        file_path: {
          [require('sequelize').Op.not]: null,
        },
      },
    });

    console.log(`📋 Found ${allDocs.length} documents to check...\n`);

    let fixedCount = 0;
    let noChangeCount = 0;

    for (const doc of allDocs) {
      const originalPath = doc.file_path;
      let newPath = originalPath;

      // Extract just the filename if path contains 'uploads/'
      if (originalPath.includes('uploads/')) {
        newPath = originalPath.split('uploads/')[1];
        console.log(`\n✏️  Document ID: ${doc.id}`);
        console.log(`   Old path: ${originalPath}`);
        console.log(`   New path: ${newPath}`);

        await doc.update({ file_path: newPath });
        fixedCount++;
        console.log('   ✅ Updated');
      } else {
        noChangeCount++;
      }
    }

    console.log(`\n\n🎉 Fix completed!`);
    console.log(`   ✅ Fixed: ${fixedCount} documents`);
    console.log(`   ℹ️  No change: ${noChangeCount} documents`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing file paths:', err);
    process.exit(1);
  }
}

fixFilePaths();
