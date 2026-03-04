-- Test Script for Database Migration
-- This script will validate the syntax of migration files

-- Test 1: Check if initial schema is valid
SOURCE backend/migrations/001_initial_schema.sql;

-- Test 2: Check if data seeding is valid
SOURCE backend/migrations/013_data_seeding.sql;

-- Test 3: Check if existing data migration is valid
SOURCE backend/migrations/014_existing_data_migration.sql;

-- Test 4: Verify table creation
SHOW TABLES;

-- Test 5: Verify foreign key constraints
SELECT 
  TABLE_NAME, 
  COLUMN_NAME, 
  CONSTRAINT_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'pup_sinag' 
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Test 6: Verify indexes
SHOW INDEX FROM users;
SHOW INDEX FROM companies;
SHOW INDEX FROM supervisors;
SHOW INDEX FROM interns;

-- Test 7: Verify sample data
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as company_count FROM companies;
SELECT COUNT(*) as intern_count FROM interns;

-- Test 8: Verify foreign key relationships
SELECT 
  i.id as intern_id,
  u.email as user_email,
  c.name as company_name,
  s.name as supervisor_name
FROM interns i
LEFT JOIN users u ON i.user_id = u.id
LEFT JOIN companies c ON i.company_id = c.id
LEFT JOIN supervisors s ON i.supervisor_id = s.id
LIMIT 10;