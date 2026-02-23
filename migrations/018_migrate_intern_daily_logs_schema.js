/* eslint-env node */
require('dotenv').config();
const path = require('path');
const { sequelize } = require(path.join(__dirname, '../models'));

/**
 * Migrate intern_daily_logs table to new schema
 * OLD: id, intern_id, date, logDate, hours_worked, task_description, notes, photos, status, approved_by, approval_remarks, createdAt, updatedAt
 * NEW: id, intern_id, day_no, log_date, time_in, time_out, total_hours, tasks_accomplished, skills_enhanced, learning_applied, photo_path, supervisor_status, adviser_status, supervisor_comment, adviser_comment, supervisor_approved_at, adviser_approved_at, createdAt, updatedAt
 */
async function migratSchema() {
  try {
    console.log('🔄 Starting schema migration for intern_daily_logs...\n');

    // Step 1: Check if old columns exist
    console.log('📋 Checking existing table structure...');
    const tableInfo = await sequelize.query(
      `DESCRIBE intern_daily_logs`
    );
    
    const existingColumns = tableInfo[0].map(col => col.Field);
    console.log('Current columns:', existingColumns);
    console.log('');

    // Step 2: Add new columns if they don't exist
    const columnsToAdd = [
      { name: 'day_no', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN day_no INT NOT NULL DEFAULT 0' },
      { name: 'log_date', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN log_date DATE' },
      { name: 'time_in', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN time_in TIME' },
      { name: 'time_out', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN time_out TIME' },
      { name: 'total_hours', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN total_hours DECIMAL(5,2)' },
      { name: 'tasks_accomplished', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN tasks_accomplished LONGTEXT' },
      { name: 'skills_enhanced', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN skills_enhanced LONGTEXT' },
      { name: 'learning_applied', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN learning_applied LONGTEXT' },
      { name: 'photo_path', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN photo_path JSON' },
      { name: 'supervisor_status', sql: `ALTER TABLE intern_daily_logs ADD COLUMN supervisor_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'` },
      { name: 'adviser_status', sql: `ALTER TABLE intern_daily_logs ADD COLUMN adviser_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'` },
      { name: 'supervisor_comment', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN supervisor_comment LONGTEXT' },
      { name: 'adviser_comment', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN adviser_comment LONGTEXT' },
      { name: 'supervisor_approved_at', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN supervisor_approved_at DATETIME' },
      { name: 'adviser_approved_at', sql: 'ALTER TABLE intern_daily_logs ADD COLUMN adviser_approved_at DATETIME' },
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name}`);
        await sequelize.query(column.sql);
        console.log(`✅ Column ${column.name} added`);
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    console.log('');

    // Step 3: Migrate data from old columns to new columns
    console.log('🔄 Migrating data from old schema to new schema...');
    
    // Use logDate or date for log_date
    console.log('⏳ Setting log_date...');
    await sequelize.query(
      `UPDATE intern_daily_logs 
       SET log_date = COALESCE(logDate, STR_TO_DATE(date, '%Y-%m-%d'), CURDATE())
       WHERE log_date IS NULL`
    );
    console.log('✅ log_date set');

    // Parse hours_worked into time_in and time_out (assume 8-hour day)
    console.log('⏳ Setting time_in and time_out...');
    await sequelize.query(
      `UPDATE intern_daily_logs 
       SET 
         time_in = COALESCE(time_in, '08:00:00'),
         time_out = COALESCE(time_out, TIME_ADD('08:00:00', INTERVAL CAST(IFNULL(hours_worked, 8) AS SIGNED) HOUR))
       WHERE time_in IS NULL OR time_out IS NULL`
    );
    console.log('✅ time_in and time_out set');

    // Set total_hours
    console.log('⏳ Setting total_hours...');
    await sequelize.query(
      `UPDATE intern_daily_logs 
       SET total_hours = COALESCE(hours_worked, 0)
       WHERE total_hours IS NULL`
    );
    console.log('✅ total_hours set');

    // Migrate task_description to tasks_accomplished
    console.log('⏳ Migrating task_description to tasks_accomplished...');
    await sequelize.query(
      `UPDATE intern_daily_logs 
       SET tasks_accomplished = COALESCE(task_description, '')
       WHERE tasks_accomplished IS NULL OR tasks_accomplished = ''`
    );
    console.log('✅ tasks_accomplished set');

    // Migrate notes to skills_enhanced
    console.log('⏳ Migrating notes to skills_enhanced...');
    await sequelize.query(
      `UPDATE intern_daily_logs 
       SET skills_enhanced = COALESCE(notes, '')
       WHERE skills_enhanced IS NULL OR skills_enhanced = ''`
    );
    console.log('✅ skills_enhanced set');

    // Migrate photos to photo_path (convert to JSON array)
    console.log('⏳ Migrating photos to photo_path...');
    await sequelize.query(
      `UPDATE intern_daily_logs 
       SET photo_path = JSON_ARRAY(photos)
       WHERE photo_path IS NULL AND photos IS NOT NULL`
    );
    console.log('✅ photo_path set');

    // Migrate status to supervisor_status and adviser_status
    console.log('⏳ Setting supervisor_status and adviser_status...');
    await sequelize.query(
      `UPDATE intern_daily_logs 
       SET 
         supervisor_status = COALESCE(NULLIF(status, ''), 'Pending'),
         adviser_status = 'Pending'
       WHERE supervisor_status = 'Pending'`
    );
    console.log('✅ supervisor_status and adviser_status set');

    // Migrate approval_remarks to comments
    console.log('⏳ Migrating approval_remarks to supervisor_comment...');
    await sequelize.query(
      `UPDATE intern_daily_logs 
       SET supervisor_comment = COALESCE(approval_remarks, '')
       WHERE supervisor_comment IS NULL`
    );
    console.log('✅ supervisor_comment set');

    // Generate day_no based on sequence per intern
    console.log('⏳ Generating day_no values...');
    await sequelize.query(`
      UPDATE intern_daily_logs idl
      SET day_no = (
        SELECT COUNT(*) 
        FROM intern_daily_logs idl2 
        WHERE idl2.intern_id = idl.intern_id 
        AND (idl2.log_date < idl.log_date OR (idl2.log_date = idl.log_date AND idl2.id <= idl.id))
      )
      WHERE day_no = 0
    `);
    console.log('✅ day_no values generated');
    console.log('');

    // Step 4: Create indexes
    console.log('📑 Creating indexes...');
    try {
      await sequelize.query(
        `ALTER TABLE intern_daily_logs ADD UNIQUE INDEX uniq_daily_log_date (intern_id, log_date)`
      );
      console.log('✅ Unique index on intern_id, log_date created');
    } catch (err) {
      if (err.message.includes('Duplicate entry') || err.message.includes('already exists')) {
        console.log('✅ Unique index on intern_id, log_date already exists');
      } else {
        throw err;
      }
    }

    try {
      await sequelize.query(
        `ALTER TABLE intern_daily_logs ADD UNIQUE INDEX uniq_daily_log_day (intern_id, day_no)`
      );
      console.log('✅ Unique index on intern_id, day_no created');
    } catch (err) {
      if (err.message.includes('Duplicate entry') || err.message.includes('already exists')) {
        console.log('✅ Unique index on intern_id, day_no already exists');
      } else {
        throw err;
      }
    }
    console.log('');

    console.log('✅ ✅ ✅ Migration completed successfully!');
    console.log('\n⚠️  NOTE: Old columns (date, logDate, hours_worked, task_description, notes, photos, status, approved_by, approval_remarks) are still in the table.');
    console.log('   You can safely delete them after verifying the migration was successful.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migratSchema();
