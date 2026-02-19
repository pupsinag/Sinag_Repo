/* eslint-env node */
require('dotenv').config();
const path = require('path');
const { sequelize } = require(path.join(__dirname, '../models'));

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add day_no column to intern_daily_logs...');
    
    // Check if column exists
    const tableDescription = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'intern_daily_logs' AND COLUMN_NAME = 'day_no'`
    );

    if (tableDescription[0].length > 0) {
      console.log('✅ Column day_no already exists');
      return;
    }

    // Add the column
    console.log('📝 Adding day_no column...');
    await sequelize.query(
      `ALTER TABLE intern_daily_logs ADD COLUMN day_no INT NOT NULL DEFAULT 0`
    );
    console.log('✅ Column added');

    // Update existing rows with sequential day_no values per intern
    console.log('🔄 Updating existing rows with day_no values...');
    await sequelize.query(`
      UPDATE intern_daily_logs idl
      SET day_no = (
        SELECT COUNT(*) 
        FROM intern_daily_logs idl2 
        WHERE idl2.intern_id = idl.intern_id 
        AND (idl2.log_date < idl.log_date OR (idl2.log_date = idl.log_date AND idl2.id <= idl.id))
      )
    `);
    console.log('✅ Rows updated');

    // Add unique constraint if it doesn't exist
    console.log('📝 Adding unique constraint...');
    try {
      await sequelize.query(
        `ALTER TABLE intern_daily_logs ADD CONSTRAINT unique_intern_day_no UNIQUE (intern_id, day_no)`
      );
      console.log('✅ Unique constraint added');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('✅ Unique constraint already exists');
      } else {
        throw err;
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
