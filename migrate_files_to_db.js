/**
 * MIGRATION: Add file_content and file_size to intern_documents table
 * Run this script to enable database-based file storage (Hostinger compatible)
 * 
 * Usage: node migrate_files_to_db.js
 */

require('dotenv').config();
const sequelize = require('./config/database');

async function runMigration() {
  try {
    console.log('\n========== MIGRATING DATABASE FOR FILE STORAGE ==========\n');

    // Check if columns already exist
    const queryInterface = sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable('intern_documents');

    const hasFileContent = 'file_content' in columns;
    const hasFileSize = 'file_size' in columns;

    if (hasFileContent && hasFileSize) {
      console.log('✅ Columns already exist in database!');
      console.log('   - file_content: present');
      console.log('   - file_size: present');
      console.log('\n✨ No migration needed. Database is ready for file storage.\n');
      await sequelize.close();
      process.exit(0);
    }

    console.log('📝 Adding columns to intern_documents table...\n');

    // Add file_content column
    if (!hasFileContent) {
      await queryInterface.addColumn('intern_documents', 'file_content', {
        type: sequelize.DataTypes.BLOB('longblob'),
        allowNull: true,
        comment: 'Stores actual file content in database (Hostinger compatible)'
      });
      console.log('✅ Added column: file_content (LONGBLOB)');
    }

    // Add file_size column
    if (!hasFileSize) {
      await queryInterface.addColumn('intern_documents', 'file_size', {
        type: sequelize.DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        comment: 'Size of file in bytes'
      });
      console.log('✅ Added column: file_size (INT UNSIGNED)');
    }

    // Create indexes for performance
    console.log('\n📋 Creating indexes for performance...');
    
    try {
      await queryInterface.addIndex('intern_documents', ['intern_id'], {
        name: 'idx_intern_id'
      });
      console.log('✅ Created index: idx_intern_id');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('ℹ️  Index idx_intern_id already exists');
      } else {
        throw e;
      }
    }

    try {
      await queryInterface.addIndex('intern_documents', ['document_type'], {
        name: 'idx_document_type'
      });
      console.log('✅ Created index: idx_document_type');
    } catch (e) {
      if (e.message.includes('Duplicate')) {
        console.log('ℹ️  Index idx_document_type already exists');
      } else {
        throw e;
      }
    }

    console.log('\n✨ MIGRATION COMPLETE!\n');
    console.log('Database is now ready for file storage:');
    console.log('- Files will be stored in the "file_content" column');
    console.log('- File sizes will be tracked in "file_size" column');
    console.log('- All future uploads will persist through deployments\n');

    await sequelize.close();
    process.exit(0);

  } catch (err) {
    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', err.message);
    console.error('\nPlease run this SQL manually in PHPMyAdmin:\n');
    console.error(`
ALTER TABLE \`intern_documents\` 
ADD COLUMN \`file_content\` LONGBLOB NULL AFTER \`file_path\`,
ADD COLUMN \`file_size\` INT UNSIGNED NULL AFTER \`file_content\`;

ALTER TABLE \`intern_documents\` ADD INDEX \`idx_intern_id\` (\`intern_id\`);
ALTER TABLE \`intern_documents\` ADD INDEX \`idx_document_type\` (\`document_type\`);
    `);
    
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
