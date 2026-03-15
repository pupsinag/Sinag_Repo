/* ======================
   MIGRATION 027: Fix Supervisor Email Constraint
   
   Purpose: Change email constraint from globally unique to 
   composite unique (company_id, email) to allow multiple 
   supervisors with the same email in different companies.
   
   This migration recreates the supervisors table with the
   corrected constraint.
====================== */

const sequelize = require('../config/database');

const migrateUp = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('[Migration 027] Starting...');
    
    // ✅ Check if supervisors table exists
    const supervisor_exists = await queryInterface.showAllSchemas();
    console.log('[Migration 027] Schemas:', supervisor_exists);
    
    // SQLite: Use PRAGMA to get table info
    const tableExists = await sequelize.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='supervisors'
    `);
    
    if (!tableExists[0] || tableExists[0].length === 0) {
      console.log('[Migration 027] ✅ Table does not exist, skipping migration');
      return;
    }
    
    console.log('[Migration 027] ✅ Supervisors table exists, proceeding with migration...');
    
    // ✅ STEP 1: Disable foreign key constraints temporarily
    await sequelize.query('PRAGMA foreign_keys = OFF');
    console.log('[Migration 027] Foreign keys disabled');
    
    // ✅ STEP 2: Get existing supervisors data
    const [existingData] = await sequelize.query('SELECT * FROM supervisors');
    console.log(`[Migration 027] Backed up ${existingData.length} supervisor records`);
    
    // ✅ STEP 3: Drop the old table
    await sequelize.query('DROP TABLE IF EXISTS supervisors');
    console.log('[Migration 027] Dropped old supervisors table');
    
    // ✅ STEP 4: Create new supervisors table with corrected constraints
    await sequelize.query(`
      CREATE TABLE supervisors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        user_id INTEGER,
        company_id INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE (company_id, email)
      )
    `);
    console.log('[Migration 027] Created new supervisors table with composite unique constraint');
    
    // ✅ STEP 5: Restore data if it exists
    if (existingData.length > 0) {
      // Build insert statement with existing data
      const placeholders = existingData.map(() => 
        '(?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).join(',');
      
      const values = existingData.flatMap(row => [
        row.id,
        row.name,
        row.email,
        row.phone || null,
        row.is_active !== undefined ? row.is_active : 1,
        row.user_id || null,
        row.company_id,
        row.createdAt || new Date().toISOString(),
        row.updatedAt || new Date().toISOString(),
      ]);
      
      await sequelize.query(
        `INSERT INTO supervisors 
         (id, name, email, phone, is_active, user_id, company_id, createdAt, updatedAt) 
         VALUES ${placeholders}`,
        { replacements: values }
      );
      console.log(`[Migration 027] ✅ Restored ${existingData.length} supervisor records`);
    }
    
    // ✅ STEP 6: Re-enable foreign key constraints
    await sequelize.query('PRAGMA foreign_keys = ON');
    console.log('[Migration 027] Foreign keys re-enabled');
    
    console.log('[Migration 027] ✅ Migration completed successfully!');
    console.log('[Migration 027] Summary:');
    console.log('  - Email constraint changed from UNIQUE to UNIQUE (company_id, email)');
    console.log('  - Multiple supervisors with same email can now exist in different companies');
    
  } catch (error) {
    console.error('[Migration 027] ❌ Error:', error.message);
    
    // Try to re-enable foreign keys even on error
    try {
      await sequelize.query('PRAGMA foreign_keys = ON');
    } catch (fkError) {
      console.error('[Migration 027] Failed to re-enable foreign keys:', fkError.message);
    }
    
    throw error;
  }
};

const migrateDown = async () => {
  console.log('[Migration 027] Down: This migration cannot be safely reverted.');
  console.log('[Migration 027] If needed, restore from backup or recreate the table manually.');
};

module.exports = {
  up: migrateUp,
  down: migrateDown,
};
