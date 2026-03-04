/* eslint-env node */
const sequelize = require('../config/database');

/**
 * Add missing columns to intern_daily_logs table
 */
async function addMissingColumns() {
  try {
    // Check if day_no column exists
    const dayNoColumnExists = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'intern_daily_logs' AND TABLE_SCHEMA = DATABASE() 
      AND COLUMN_NAME = 'day_no'
    `).then(([results]) => {
      return results.length > 0;
    });

    if (!dayNoColumnExists) {
      await sequelize.query(`
        ALTER TABLE intern_daily_logs
        ADD COLUMN day_no INT NOT NULL DEFAULT 0
      `);
      console.log('✅ Column day_no added');

      // Update existing rows with sequential day_no values per intern
      await sequelize.query(`
        UPDATE intern_daily_logs idl
        SET day_no = (
          SELECT COUNT(*) 
          FROM intern_daily_logs idl2 
          WHERE idl2.intern_id = idl.intern_id 
          AND (idl2.log_date < idl.log_date OR (idl2.log_date = idl.log_date AND idl2.id <= idl.id))
        )
      `);
      console.log('✅ Existing rows updated with day_no values');
    } else {
      console.log('✅ Column day_no already exists');
    }

    // Check if supervisor_approved_at column exists using MySQL INFORMATION_SCHEMA
    const supervisorColumnExists = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'intern_daily_logs' AND TABLE_SCHEMA = DATABASE() 
      AND COLUMN_NAME = 'supervisor_approved_at'
    `).then(([results]) => {
      return results.length > 0;
    });

    if (!supervisorColumnExists) {
      await sequelize.query(`
        ALTER TABLE intern_daily_logs
        ADD COLUMN supervisor_approved_at DATETIME NULL
      `);
      console.log('✅ Column supervisor_approved_at added');
    } else {
      console.log('✅ Column supervisor_approved_at already exists');
    }

    // Check if adviser_approved_at column exists using MySQL INFORMATION_SCHEMA
    const adviserColumnExists = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'intern_daily_logs' AND TABLE_SCHEMA = DATABASE() 
      AND COLUMN_NAME = 'adviser_approved_at'
    `).then(([results]) => {
      return results.length > 0;
    });

    if (!adviserColumnExists) {
      await sequelize.query(`
        ALTER TABLE intern_daily_logs
        ADD COLUMN adviser_approved_at DATETIME NULL
      `);
      console.log('✅ Column adviser_approved_at added');
    } else {
      console.log('✅ Column adviser_approved_at already exists');
    }

  } catch (err) {
    console.error('❌ Error adding missing columns:', err.message);
    throw err;
  }
}

module.exports = addMissingColumns;
