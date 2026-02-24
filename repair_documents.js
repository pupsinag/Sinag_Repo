/* eslint-env node */
'use strict';

const fs = require('fs').promises;
const path = require('path');
const { sequelize, InternDocuments, Intern } = require('./models');

const uploadsDir = path.join(__dirname, 'uploads');

async function repairDocumentPaths() {
  try {
    console.log('🔧 Starting document path repair...\n');

    // Get all actual files in uploads dir with their timestamps
    const files = await fs.readdir(uploadsDir);
    const fileStats = {};

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stat = await fs.stat(filePath);
      fileStats[file] = {
        mtime: stat.mtime,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      };
    }

    console.log(`📁 Found ${files.length} files in uploads directory\n`);

    // Get all document records from database
    const docs = await InternDocuments.findAll({
      include: [{ model: Intern, attributes: ['id', 'user_id'], include: [{ model: require('./models').User, attributes: ['firstName', 'lastName'] }] }],
    });

    console.log(`📊 Found ${docs.length} document records in database\n`);

    let repaired = 0;
    let notFound = 0;

    for (const doc of docs) {
      const currentPath = doc.file_path;
      
      // Check if current path exists
      const currentExists = files.includes(currentPath);
      if (currentExists) {
        console.log(`✅ ${doc.id}: ${doc.document_type} - Path OK: ${currentPath}`);
        continue;
      }

      // Try to find matching file
      let bestMatch = null;
      let bestScore = 0;

      // Calculate time difference for each file
      const uploadedTime = new Date(doc.uploaded_date).getTime();
      
      for (const file of files) {
        const fileTime = fileStats[file].mtimeMs;
        const timeDiff = Math.abs(uploadedTime - fileTime);
        const timeScore = timeDiff < 5000 ? 100 : timeDiff < 60000 ? 50 : 0; // Within 5 sec = excellent, 1 min = ok

        // Document type matching
        const docTypeUpper = doc.document_type.toUpperCase();
        const fileUpper = file.toUpperCase();
        const typeScore = fileUpper.includes(docTypeUpper) ? 50 : 0;

        const totalScore = timeScore + typeScore;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = { file, score: totalScore, timeScore, typeScore };
        }
      }

      if (bestMatch && bestScore > 0) {
        console.log(`⚙️  ${doc.id}: ${doc.document_type}`);
        console.log(`   Old path: ${currentPath}`);
        console.log(`   New path: ${bestMatch.file}`);
        console.log(`   Score: ${bestMatch.score} (time:${bestMatch.timeScore} type:${bestMatch.typeScore})`);

        // Update database
        await InternDocuments.update(
          { file_path: bestMatch.file },
          { where: { id: doc.id } }
        );
        console.log(`   ✅ UPDATED\n`);
        repaired++;
      } else {
        console.log(`❌ ${doc.id}: ${doc.document_type} - NOT FOUND (${currentPath})\n`);
        notFound++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`🎉 Repair Complete!`);
    console.log(`   Repaired: ${repaired}`);
    console.log(`   Not Found: ${notFound}`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error during repair:', err);
    process.exit(1);
  }
}

repairDocumentPaths();
