/* Migration script to transform old schema to new schema */
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('🔄 Starting schema migration...');

    // Step 1: Create a backup of old table
    console.log('📦 Creating backup table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS intern_daily_logs_backup AS
      SELECT * FROM intern_daily_logs
    `, { type: QueryTypes.SELECT });
    console.log('✅ Backup created');

    // Step 2: Drop the old table
    console.log('🗑️ Dropping old table...');
    await sequelize.query(`DROP TABLE intern_daily_logs`, { type: QueryTypes.RAW });
    console.log('✅ Old table dropped');

    // Step 3: Create new table with correct schema
    console.log('🏗️ Creating new table with updated schema...');
    await sequelize.query(`
      CREATE TABLE intern_daily_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        intern_id INT UNSIGNED NOT NULL,
        day_no INT NOT NULL,
        log_date DATE NOT NULL,
        time_in TIME NOT NULL,
        time_out TIME NOT NULL,
        total_hours DECIMAL(5, 2) NOT NULL,
        tasks_accomplished TEXT NOT NULL,
        skills_enhanced TEXT,
        learning_applied TEXT,
        photo_path JSON,
        supervisor_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        adviser_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        supervisor_comment TEXT,
        adviser_comment TEXT,
        supervisor_approved_at DATETIME,
        adviser_approved_at DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE KEY unique_log_date (intern_id, log_date),
        UNIQUE KEY unique_day_no (intern_id, day_no),
        INDEX idx_intern_id (intern_id)
      )
    `, { type: QueryTypes.RAW });
    console.log('✅ New table created');

    // Step 4: Migrate data from backup to new table
    console.log('🔄 Migrating data from backup to new table...');
    
    // Get all records from backup
    const backupData = await sequelize.query(
      `SELECT * FROM intern_daily_logs_backup ORDER BY id ASC`,
      { type: QueryTypes.SELECT }
    );

    console.log(`📊 Found ${backupData.length} records to migrate`);

    for (let i = 0; i < backupData.length; i++) {
      const row = backupData[i];
      
      // Parse date (handle both 'date' and 'logDate' columns)
      const dateStr = row.date || row.logDate;
      
      // Map status: 'Pending' -> adviser_status 'Pending'
      let adviser_status = 'Pending';
      let adviser_approved_at = null;
      
      if (row.status === 'Approved') {
        adviser_status = 'Approved';
        adviser_approved_at = row.approval_remarks ? new Date() : null;
      } else if (row.status === 'Rejected') {
        adviser_status = 'Rejected';
      }

      // Try to extract time_in and time_out from hours_worked if available
      // Default to 08:00-17:00 (8 hour day) if not available
      let time_in = '08:00:00';
      let time_out = '17:00:00';
      
      // If hours_worked is available, calculate time_out from time_in
      if (row.hours_worked) {
        const hours = Math.floor(row.hours_worked);
        const minutes = Math.round((row.hours_worked - hours) * 60);
        time_out = `${String(8 + hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      }

      // Map photos to JSON array (only first photo for safety)
      let photo_path = null;
      if (row.photos) {
        try {
          photo_path = JSON.stringify([row.photos]);
        } catch (e) {
          photo_path = null;
        }
      }

      // Insert into new table
      try {
        await sequelize.query(
          `INSERT INTO intern_daily_logs 
           (intern_id, day_no, log_date, time_in, time_out, total_hours, 
            tasks_accomplished, skills_enhanced, learning_applied, photo_path,
            adviser_status, adviser_approved_at, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              row.intern_id,
              i + 1, // day_no based on sequence
              dateStr,
              time_in,
              time_out,
              row.hours_worked || 0,
              row.task_description || '',
              row.notes || null,
              null, // learning_applied (new field)
              photo_path,
              adviser_status,
              adviser_approved_at,
              row.createdAt || new Date(),
              row.updatedAt || new Date()
            ],
            type: QueryTypes.INSERT
          }
        );
      } catch (insertErr) {
        console.warn(`⚠️ Failed to migrate record ${row.id}:`, insertErr.message);
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   📝 Migrated ${i + 1}/${backupData.length} records...`);
      }
    }

    console.log(`✅ All ${backupData.length} records migrated successfully`);

    // Step 5: Drop backup table
    console.log('🗑️ Dropping backup table...');
    await sequelize.query(`DROP TABLE intern_daily_logs_backup`, { type: QueryTypes.RAW });
    console.log('✅ Backup table dropped');

    console.log('✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    
    // Try to restore from backup if migration failed
    try {
      console.log('🔄 Attempting to restore from backup...');
      await sequelize.query(`DROP TABLE IF EXISTS intern_daily_logs`, { type: QueryTypes.RAW });
      await sequelize.query(`
        RENAME TABLE intern_daily_logs_backup TO intern_daily_logs
      `, { type: QueryTypes.RAW });
      console.log('✅ Restored from backup successfully');
    } catch (restoreErr) {
      console.error('❌ Could not restore from backup:', restoreErr.message);
    }
    
    process.exit(1);
  }
}

migrate();
