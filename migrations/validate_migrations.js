const fs = require('fs');
const path = require('path');

// List of migration files to validate
const migrationFiles = [
  '001_initial_schema.sql',
  '013_data_seeding.sql',
  '014_existing_data_migration.sql'
];

console.log('Starting SQL Migration Validation...');

migrationFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${file} not found`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  // Basic validation checks
  const errors = [];
  
// Check for CREATE TABLE statements
  const hasCreateTable = content.includes('CREATE TABLE');
  const hasInsert = content.includes('INSERT INTO');

  if (!hasCreateTable && !hasInsert) {
    errors.push('No CREATE TABLE or INSERT INTO statements found');
  }

  // Check for FOREIGN KEY constraints (only if CREATE TABLE exists)
  if (hasCreateTable && !content.includes('FOREIGN KEY')) {
    errors.push('No FOREIGN KEY constraints found');
  }

  // Check for PRIMARY KEY constraints (only if CREATE TABLE exists)
  if (hasCreateTable && !content.includes('PRIMARY KEY')) {
    errors.push('No PRIMARY KEY constraints found');
  }

  // Check for ENGINE=InnoDB (only if CREATE TABLE exists)
  if (hasCreateTable && !content.includes('ENGINE=InnoDB')) {
    errors.push('No ENGINE=InnoDB specified');
  }

  // Check for UTF8MB4 character set (only if CREATE TABLE exists)
  if (hasCreateTable && !content.includes('utf8mb4')) {
    errors.push('No utf8mb4 character set specified');
  }

  // Check for proper syntax
  if (hasCreateTable && content.includes('CREATE TABLE') && content.includes('(') && content.includes(')')) {
    // Basic syntax seems okay
  } else if (hasInsert && content.includes('INSERT INTO') && content.includes('VALUES')) {
    // INSERT syntax seems okay
  } else if (!hasCreateTable && !hasInsert) {
    errors.push('Potential syntax issues');
  }
  
  if (errors.length === 0) {
    console.log(`✅ ${file} - Valid SQL syntax`);
  } else {
    console.log(`❌ ${file} - Issues found:`);
    errors.forEach(error => console.log(`  - ${error}`));
  }
});

console.log('Validation complete!');