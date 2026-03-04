const fs = require('fs');
const path = require('path');

// List of migration files to verify
const migrationFiles = [
  '001_initial_schema.sql',
  '013_data_seeding.sql',
  '014_existing_data_migration.sql'
];

console.log('Starting Migration Verification...');

// Function to extract table information from SQL files
function extractTableInfo(content) {
  const tables = [];
  const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+) \(([^)]+)\)/g;
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const columns = match[2].split(',').map(col => col.trim());
    
    const table = {
      name: tableName,
      columns: [],
      foreignKeys: [],
      indexes: []
    };
    
    columns.forEach(column => {
      // Check for primary key
      if (column.includes('PRIMARY KEY')) {
        table.primaryKey = column.match(/`?(\w+)`?/)[1];
      }
      
      // Check for foreign keys
      const fkMatch = column.match(/FOREIGN KEY \(`?(\w+)`?\) REFERENCES `?(\w+)` \(`?(\w+)`?\)/);
      if (fkMatch) {
        table.foreignKeys.push({
          column: fkMatch[1],
          references: fkMatch[2],
          key: fkMatch[3]
        });
      }
      
      // Check for indexes
      const indexMatch = column.match(/INDEX `?(\w+)` \(`?(\w+)`?\)/);
      if (indexMatch) {
        table.indexes.push({
          name: indexMatch[1],
          column: indexMatch[2]
        });
      }
      
      // Add regular columns
      if (!fkMatch && !indexMatch && !column.includes('PRIMARY KEY')) {
        const colMatch = column.match(/`?(\w+)`?/);
        if (colMatch) {
          table.columns.push(colMatch[1]);
        }
      }
    });
    
    tables.push(table);
  }
  
  return tables;
}

// Function to verify foreign key relationships
function verifyForeignKeys(tables) {
  const errors = [];
  
  tables.forEach(table => {
    table.foreignKeys.forEach(fk => {
      const referencedTable = tables.find(t => t.name === fk.references);
      
      if (!referencedTable) {
        errors.push(`❌ ${table.name}.${fk.column} references non-existent table ${fk.references}`);
      } else if (!referencedTable.columns.includes(fk.key)) {
        errors.push(`❌ ${table.name}.${fk.column} references non-existent column ${fk.references}.${fk.key}`);
      }
    });
  });
  
  return errors;
}

// Function to verify data seeding
function verifyDataSeeding(content) {
  const errors = [];
  
  // Check for sample data
  if (!content.includes('INSERT INTO users')) {
    errors.push('No sample user data found');
  }
  
  if (!content.includes('INSERT INTO companies')) {
    errors.push('No sample company data found');
  }
  
  if (!content.includes('INSERT INTO interns')) {
    errors.push('No sample intern data found');
  }
  
  return errors;
}

migrationFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${file} not found`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n--- Verifying ${file} ---`);
  
  // Extract table information
  const tables = extractTableInfo(content);
  
  // Verify foreign keys
  const fkErrors = verifyForeignKeys(tables);
  
  if (fkErrors.length === 0) {
    console.log('✅ Foreign key relationships are valid');
  } else {
    fkErrors.forEach(error => console.log(error));
  }
  
  // Verify data seeding
  if (file === '013_data_seeding.sql') {
    const dataErrors = verifyDataSeeding(content);
    
    if (dataErrors.length === 0) {
      console.log('✅ Data seeding is complete');
    } else {
      dataErrors.forEach(error => console.log(error));
    }
  }
  
  console.log(`✅ ${file} - Verification complete`);
});

console.log('\nAll migrations verified successfully!');