// Run Migration 023: Create company_documents table
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sinag_internship',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function runMigration() {
  let connection;
  try {
    console.log('📊 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);

    console.log('✅ Connected to database');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '023_create_company_documents_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration 023...');
    
    // Split by semicolon to handle multiple statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      try {
        console.log(`\n📝 Executing: ${statement.substring(0, 50)}...`);
        await connection.query(statement);
        console.log('✅ Statement executed successfully');
      } catch (err) {
        // Some statements might fail if table already exists (that's ok)
        if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Warning (expected): ${err.message}`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ Migration 023 completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
