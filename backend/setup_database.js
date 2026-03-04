/* eslint-env node */
'use strict';

/**
 * Database Setup Script
 * Creates all tables using raw SQL queries
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS)
 */

const sequelize = require('./config/database');

const tableCreationSQL = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(255),
    lastName VARCHAR(255),
    mi VARCHAR(10),
    studentId VARCHAR(100),
    role VARCHAR(50) NOT NULL,
    program VARCHAR(255),
    yearSection VARCHAR(100),
    guardian VARCHAR(255),
    resetCode VARCHAR(255),
    resetCodeExpires DATETIME,
    forcePasswordChange TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Companies table
  `CREATE TABLE IF NOT EXISTS companies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT,
    natureOfBusiness VARCHAR(255),
    supervisorName VARCHAR(255),
    moaStart DATE,
    moaEnd DATE,
    moaFile VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    forcePasswordChange TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Supervisors table
  `CREATE TABLE IF NOT EXISTS supervisors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    user_id INT UNSIGNED,
    company_id INT UNSIGNED NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_company_id (company_id),
    INDEX idx_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Interns table
  `CREATE TABLE IF NOT EXISTS interns (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    status VARCHAR(100) NOT NULL DEFAULT 'Pending',
    remarks TEXT,
    adviser_id INT UNSIGNED,
    supervisor_id INT UNSIGNED,
    company_id INT UNSIGNED,
    position VARCHAR(255),
    program VARCHAR(255) NOT NULL,
    year_section VARCHAR(100),
    start_date DATE,
    end_date DATE,
    required_hours INT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (adviser_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_company_id (company_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // HTE Evaluations table
  `CREATE TABLE IF NOT EXISTS hte_evaluations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    intern_id INT UNSIGNED NOT NULL,
    company_id INT UNSIGNED NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    program VARCHAR(255) NOT NULL,
    school_term VARCHAR(100) NOT NULL,
    academic_year VARCHAR(100) NOT NULL,
    evaluation_date DATE NOT NULL,
    ratings JSON,
    remarks TEXT,
    strengths TEXT,
    improvements TEXT,
    recommendations TEXT,
    submitted_by VARCHAR(255) NOT NULL,
    noted_by VARCHAR(255),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_evaluation (intern_id, academic_year, school_term),
    INDEX idx_intern_id (intern_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Intern Evaluations table
  `CREATE TABLE IF NOT EXISTS intern_evaluations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    intern_id INT UNSIGNED NOT NULL,
    internName VARCHAR(255) NOT NULL,
    section VARCHAR(255),
    hteName VARCHAR(255),
    jobDescription TEXT,
    totalScore FLOAT NOT NULL,
    technicalDetails TEXT,
    recommendations TEXT,
    remarks TEXT,
    evaluator VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    conforme VARCHAR(255),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_intern_id (intern_id),
    INDEX idx_date (date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Supervisor Evaluations table
  `CREATE TABLE IF NOT EXISTS supervisor_evaluations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    intern_id INT UNSIGNED NOT NULL,
    supervisor_id INT UNSIGNED NOT NULL,
    company_id INT UNSIGNED NOT NULL,
    academic_year VARCHAR(100) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    user_id INT UNSIGNED,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_evaluation (intern_id, supervisor_id, academic_year, semester),
    FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_intern_id (intern_id),
    INDEX idx_supervisor_id (supervisor_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Intern Daily Logs table
  `CREATE TABLE IF NOT EXISTS intern_daily_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    intern_id INT UNSIGNED NOT NULL,
    day_no INT,
    log_date DATE NOT NULL,
    time_in TIME NOT NULL,
    time_out TIME NOT NULL,
    total_hours FLOAT NOT NULL,
    tasks_accomplished TEXT NOT NULL,
    skills_enhanced TEXT,
    learning_applied TEXT,
    photo_path VARCHAR(255),
    supervisor_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    adviser_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    supervisor_comment TEXT,
    adviser_comment TEXT,
    supervisor_approved_at DATETIME,
    adviser_approved_at DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_log_date (intern_id, log_date),
    UNIQUE KEY unique_day_no (intern_id, day_no),
    INDEX idx_intern_id (intern_id),
    INDEX idx_log_date (log_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Intern Documents table
  `CREATE TABLE IF NOT EXISTS intern_documents (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    intern_id INT UNSIGNED NOT NULL,
    document_type VARCHAR(100),
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    file_content LONGBLOB,
    file_mime_type VARCHAR(100) DEFAULT 'application/octet-stream',
    download_count INT DEFAULT 0,
    last_accessed_by INT UNSIGNED,
    last_accessed_date DATETIME,
    version INT DEFAULT 1,
    uploaded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(100),
    remarks TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_intern_id (intern_id),
    INDEX idx_document_type (document_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Intern Evaluation Items table
  `CREATE TABLE IF NOT EXISTS intern_evaluation_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    evaluationId INT UNSIGNED NOT NULL,
    category VARCHAR(255) NOT NULL,
    itemText TEXT NOT NULL,
    maxScore INT NOT NULL,
    score FLOAT NOT NULL,
    remarks TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluationId) REFERENCES intern_evaluations(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_evaluationId (evaluationId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Supervisor Evaluation Items table
  `CREATE TABLE IF NOT EXISTS supervisor_evaluation_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT UNSIGNED NOT NULL,
    section VARCHAR(255) NOT NULL,
    indicator TEXT NOT NULL,
    rating INT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluation_id) REFERENCES supervisor_evaluations(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_evaluation_id (evaluation_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Migration logs table
  `CREATE TABLE IF NOT EXISTS migration_logs (
    migration_name VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'completed',
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
];

async function setupDatabase() {
  try {
    console.log('\n========== DATABASE SETUP ==========\n');

    // Authenticate connection
    await sequelize.authenticate();
    console.log('✅ Database connected:', process.env.DB_NAME);

    // Execute each table creation SQL
    let tablesCreated = 0;
    for (const sql of tableCreationSQL) {
      try {
        await sequelize.query(sql);
        tablesCreated++;
      } catch (err) {
        console.error('❌ Error executing SQL:', err.message);
        throw err;
      }
    }

    console.log(`\n✅ All tables created successfully! (${tablesCreated} tables)`);
    console.log('\n📋 Tables created:');
    console.log('  • users');
    console.log('  • companies');
    console.log('  • supervisors');
    console.log('  • interns');
    console.log('  • hte_evaluations');
    console.log('  • intern_evaluations');
    console.log('  • supervisor_evaluations');
    console.log('  • intern_daily_logs');
    console.log('  • intern_documents');
    console.log('  • intern_evaluation_items');
    console.log('  • supervisor_evaluation_items');
    console.log('  • migration_logs');

    await sequelize.close();
    console.log('\n✅ Database setup completed!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Database setup failed:', err.message);
    process.exit(1);
  }
}

setupDatabase();
