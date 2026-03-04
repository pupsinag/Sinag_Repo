/* 
 * Quick Diagnostic Script for File Storage
 * Run this to verify persistent file storage is working
 * 
 * Usage: node verify_file_storage.js
 */

const { InternDocuments } = require('./models');
const fs = require('fs');
const path = require('path');

async function runDiagnostics() {
  console.log('\n========== FILE STORAGE DIAGNOSTICS ==========\n');

  try {
    // Check 1: Database connection
    console.log('1️⃣ Checking database connection...');
    const count = await InternDocuments.count();
    console.log(`   ✅ Connected! Found ${count} documents in database\n`);

    // Check 2: Files in database
    console.log('2️⃣ Checking files stored in database...');
    const filesInDb = await InternDocuments.count({
      where: { file_content: { [require('sequelize').Op.not]: null } }
    });
    console.log(`   ✅ ${filesInDb} files have content in database`);
    console.log(`   📊 ${Math.round((filesInDb / count) * 100)}% of files are in database\n`);

    // Check 3: Recent files
    console.log('3️⃣ Recent uploaded files:');
    const recentFiles = await InternDocuments.findAll({
      limit: 5,
      order: [['uploaded_date', 'DESC']],
      attributes: ['id', 'file_name', 'document_type', 'uploaded_date', 'file_size'],
      raw: true
    });

    if (recentFiles.length === 0) {
      console.log('   ⓘ No files found');
    } else {
      recentFiles.forEach(file => {
        const hasContent = file.file_content ? '✅' : '❌';
        console.log(`   ${hasContent} ${file.file_name} (${file.file_size} bytes) - ${file.document_type}`);
      });
    }
    console.log();

    // Check 4: Filesystem uploads
    console.log('4️⃣ Checking filesystem uploads folder:');
    const uploadsDir = path.join(__dirname, 'uploads');
    let fileCount = 0;
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter(f => 
        fs.statSync(path.join(uploadsDir, f)).isFile()
      );
      fileCount = files.length;
      console.log(`   📁 Found ${fileCount} files in /uploads folder`);
      if (fileCount > 0 && fileCount <= 10) {
        files.forEach(f => console.log(`      - ${f}`));
      }
    } else {
      console.log('   ⓘ /uploads folder does not exist (normal if using DB only)');
    }
    console.log();

    // Check 5: Database statistics
    console.log('5️⃣ Database storage statistics:');
    const stats = await InternDocuments.sequelize.query(`
      SELECT 
        COUNT(*) as total_docs,
        COUNT(CASE WHEN file_content IS NOT NULL THEN 1 END) as docs_with_content,
        ROUND(SUM(CHAR_LENGTH(file_content)) / 1024 / 1024, 2) as total_size_mb,
        ROUND(AVG(CHAR_LENGTH(file_content)) / 1024, 2) as avg_size_kb,
        MAX(uploaded_date) as latest_upload
      FROM intern_documents
    `, { type: require('sequelize').QueryTypes.SELECT });

    const stat = stats[0];
    console.log(`   📊 Total documents: ${stat.total_docs}`);
    console.log(`   💾 With content in DB: ${stat.docs_with_content}`);
    console.log(`   📈 Database size: ${stat.total_size_mb} MB`);
    console.log(`   📄 Average file size: ${stat.avg_size_kb} KB`);
    console.log(`   ⏰ Latest upload: ${stat.latest_upload}\n`);

    // Final verdict
    console.log('📋 VERDICT:\n');
    if (filesInDb > 0) {
      console.log('   ✅ FILE STORAGE IS WORKING!');
      console.log('   ✅ Files are being stored in the database');
      console.log('   ✅ Files will persist across redeployments\n');
      
      if (count - filesInDb > 0) {
        console.log(`   ⚠️  ${count - filesInDb} old files not yet in database`);
        console.log('   To migrate them, run: npm run migrate:020\n');
      }
    } else {
      console.log('   🔍 No files with database content yet');
      console.log('   📋 This is normal if you just set up the feature');
      console.log('   👉 Try uploading a new document to test\n');
    }

    console.log('========== DIAGNOSTICS COMPLETE ==========\n');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error('\nMake sure:');
    console.error('  1. Your database is running');
    console.error('  2. You\'re in the correct project directory');
    console.error('  3. NODE_ENV is set correctly');
    process.exit(1);
  }
}

// Run diagnostics
runDiagnostics()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
