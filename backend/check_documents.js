const { Intern, InternDocuments, User } = require('./models');
const fs = require('fs');
const path = require('path');

async function checkDocuments() {
  try {
    console.log('\n========== CHECKING INTERN DOCUMENTS ==========\n');

    // Get all interns
    const interns = await Intern.findAll({
      include: [
        { model: User, as: 'User' },
        { model: InternDocuments, as: 'InternDocuments' }
      ]
    });

    if (interns.length === 0) {
      console.log('❌ No interns found in database');
      return;
    }

    console.log(`✅ Found ${interns.length} interns\n`);

    for (const intern of interns) {
      console.log(`\n--- INTERN: ${intern.User?.firstName} ${intern.User?.lastName} (ID: ${intern.id}) ---`);
      
      if (!intern.InternDocuments || intern.InternDocuments.length === 0) {
        console.log('  ❌ No documents found');
        continue;
      }

      console.log(`  Documents: ${intern.InternDocuments.length}`);

      for (const doc of intern.InternDocuments) {
        const filePath = path.join(__dirname, 'uploads', doc.file_path);
        const fileExists = fs.existsSync(filePath);
        
        console.log(`\n  📄 ${doc.document_type}`);
        console.log(`     File Name: ${doc.file_name}`);
        console.log(`     File Path (DB): ${doc.file_path}`);
        console.log(`     Full Path: ${filePath}`);
        console.log(`     Status: ${doc.status}`);
        console.log(`     File Exists: ${fileExists ? '✅ YES' : '❌ NO'}`);
        
        if (!fileExists) {
          console.log(`     ⚠️  WARNING: File not found on disk!`);
        }
      }
    }

    console.log('\n========== END CHECK ==========\n');
  } catch (err) {
    console.error('❌ ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}

checkDocuments();
