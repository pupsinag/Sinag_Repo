-- SINAG HARD RESET FOR MISMATCHED TABLES (MySQL/MariaDB)
-- ⚠️ DESTRUCTIVE: This will DROP mismatched tables after creating backups.
-- Use in phpMyAdmin SQL tab.

-- ======================================================
-- 0) Safety checks
-- ======================================================
SELECT DATABASE() AS active_database;

-- ======================================================
-- 1) Define required columns per table (app-critical)
--    Any table missing one of these columns is marked mismatched.
-- ======================================================
DROP TEMPORARY TABLE IF EXISTS expected_columns;
CREATE TEMPORARY TABLE expected_columns (
  table_name VARCHAR(64) NOT NULL,
  column_name VARCHAR(64) NOT NULL
);

INSERT INTO expected_columns (table_name, column_name) VALUES
  ('users', 'id'),
  ('users', 'email'),
  ('users', 'password'),
  ('users', 'role'),
  ('users', 'firstName'),
  ('users', 'lastName'),
  ('users', 'yearSection'),
  ('users', 'forcePasswordChange'),
  ('users', 'createdAt'),

  ('companies', 'id'),
  ('companies', 'name'),
  ('companies', 'email'),
  ('companies', 'password'),
  ('companies', 'forcePasswordChange'),
  ('companies', 'createdAt'),

  ('supervisors', 'id'),
  ('supervisors', 'company_id'),
  ('supervisors', 'createdAt'),

  ('interns', 'id'),
  ('interns', 'user_id'),
  ('interns', 'company_id'),
  ('interns', 'supervisor_id'),
  ('interns', 'year_section'),
  ('interns', 'createdAt'),

  ('intern_documents', 'id'),
  ('intern_documents', 'intern_id'),

  ('intern_daily_logs', 'id'),
  ('intern_daily_logs', 'intern_id'),
  ('intern_daily_logs', 'log_date'),
  ('intern_daily_logs', 'supervisor_status'),
  ('intern_daily_logs', 'adviser_status'),
  ('intern_daily_logs', 'createdAt'),

  ('hte_evaluations', 'id'),
  ('hte_evaluations', 'intern_id'),
  ('hte_evaluations', 'company_id'),
  ('hte_evaluations', 'ratings'),
  ('hte_evaluations', 'createdAt');

DROP TEMPORARY TABLE IF EXISTS mismatched_tables;
CREATE TEMPORARY TABLE mismatched_tables AS
SELECT e.table_name
FROM expected_columns e
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
  ON c.TABLE_SCHEMA = DATABASE()
 AND c.TABLE_NAME = e.table_name
 AND c.COLUMN_NAME = e.column_name
GROUP BY e.table_name
HAVING SUM(CASE WHEN c.COLUMN_NAME IS NULL THEN 1 ELSE 0 END) > 0;

-- Review first
SELECT * FROM mismatched_tables;

-- ======================================================
-- 2) Backup mismatched tables (table__backup_YYYYMMDD_HHMMSS)
-- ======================================================
SET @ts = DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s');
SET SESSION group_concat_max_len = 1000000;

SELECT GROUP_CONCAT(
  CONCAT(
    'CREATE TABLE `', table_name, '__backup_', @ts,
    '` AS SELECT * FROM `', table_name, '`'
  ) SEPARATOR '; '
) INTO @backup_sql
FROM mismatched_tables;

-- Execute only if at least one mismatched table exists
SET @backup_sql = IFNULL(@backup_sql, 'SELECT "No mismatched tables to backup"');
PREPARE stmt_backup FROM @backup_sql;
EXECUTE stmt_backup;
DEALLOCATE PREPARE stmt_backup;

-- ======================================================
-- 3) Drop mismatched tables (FK disabled temporarily)
-- ======================================================
SELECT GROUP_CONCAT(CONCAT('`', table_name, '`') SEPARATOR ', ') INTO @drop_list
FROM mismatched_tables;

SET FOREIGN_KEY_CHECKS = 0;
SET @drop_sql = IF(
  @drop_list IS NULL OR @drop_list = '',
  'SELECT "No mismatched tables to drop"',
  CONCAT('DROP TABLE ', @drop_list)
);
PREPARE stmt_drop FROM @drop_sql;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;
SET FOREIGN_KEY_CHECKS = 1;

-- ======================================================
-- 4) Recreate core tables with consistent schema
-- ======================================================
-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(255) NULL,
  lastName VARCHAR(255) NULL,
  mi VARCHAR(255) NULL,
  studentId VARCHAR(255) NULL,
  role VARCHAR(255) NOT NULL,
  program VARCHAR(255) NULL,
  yearSection VARCHAR(50) NULL,
  guardian VARCHAR(255) NULL,
  resetCode VARCHAR(255) NULL,
  resetCodeExpires DATETIME NULL,
  forcePasswordChange TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NULL,
  natureOfBusiness VARCHAR(255) NULL,
  supervisorName VARCHAR(255) NULL,
  moaStart DATE NULL,
  moaEnd DATE NULL,
  moaFile VARCHAR(255) NULL,
  password VARCHAR(255) NOT NULL,
  forcePasswordChange TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- SUPERVISORS
CREATE TABLE IF NOT EXISTS supervisors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  user_id INT NULL,
  company_id INT UNSIGNED NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_supervisors_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- INTERNS
CREATE TABLE IF NOT EXISTS interns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('Pending','Approved','Declined') NOT NULL DEFAULT 'Pending',
  remarks VARCHAR(255) NULL,
  adviser_id INT NULL,
  supervisor_id INT UNSIGNED NULL,
  company_id INT UNSIGNED NULL,
  position VARCHAR(100) NULL,
  program VARCHAR(300) NOT NULL,
  year_section VARCHAR(50) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  required_hours INT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_interns_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_interns_adviser
    FOREIGN KEY (adviser_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_interns_supervisor
    FOREIGN KEY (supervisor_id) REFERENCES supervisors(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_interns_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- INTERN DOCUMENTS
CREATE TABLE IF NOT EXISTS intern_documents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  intern_id INT UNSIGNED NOT NULL,
  document_type VARCHAR(255) NULL,
  file_name VARCHAR(255) NULL,
  file_path VARCHAR(255) NULL,
  uploaded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(255) NULL,
  remarks TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_intern_docs_intern
    FOREIGN KEY (intern_id) REFERENCES interns(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- INTERN DAILY LOGS
CREATE TABLE IF NOT EXISTS intern_daily_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  intern_id INT UNSIGNED NOT NULL,
  day_no INT NOT NULL,
  log_date DATE NOT NULL,
  time_in TIME NOT NULL,
  time_out TIME NOT NULL,
  total_hours DECIMAL(5,2) NOT NULL,
  tasks_accomplished TEXT NOT NULL,
  skills_enhanced TEXT NULL,
  learning_applied TEXT NULL,
  photo_path JSON NULL,
  supervisor_status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  adviser_status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  supervisor_comment TEXT NULL,
  adviser_comment TEXT NULL,
  supervisor_approved_at DATETIME NULL,
  adviser_approved_at DATETIME NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_intern
    FOREIGN KEY (intern_id) REFERENCES interns(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uniq_daily_log_date (intern_id, log_date),
  UNIQUE KEY uniq_daily_log_day (intern_id, day_no)
) ENGINE=InnoDB;

-- HTE EVALUATIONS
CREATE TABLE IF NOT EXISTS hte_evaluations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  intern_id INT UNSIGNED NOT NULL,
  company_id INT UNSIGNED NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  program VARCHAR(100) NOT NULL,
  school_term VARCHAR(50) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  evaluation_date DATE NOT NULL,
  ratings JSON NOT NULL,
  remarks JSON NULL,
  strengths TEXT NULL,
  improvements TEXT NULL,
  recommendations TEXT NULL,
  submitted_by VARCHAR(255) NOT NULL,
  noted_by VARCHAR(255) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hte_eval_intern
    FOREIGN KEY (intern_id) REFERENCES interns(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_hte_eval_company
    FOREIGN KEY (company_id) REFERENCES companies(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uniq_hte_eval (intern_id, academic_year, school_term)
) ENGINE=InnoDB;

-- ======================================================
-- 5) Verification
-- ======================================================
SELECT 'TABLES_AFTER_RESET' AS section, t.TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE()
  AND t.TABLE_NAME IN ('users','companies','supervisors','interns','intern_documents','intern_daily_logs','hte_evaluations')
ORDER BY t.TABLE_NAME;

SELECT 'MISMATCH_RECHECK' AS section, e.table_name, e.column_name
FROM expected_columns e
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
  ON c.TABLE_SCHEMA = DATABASE()
 AND c.TABLE_NAME = e.table_name
 AND c.COLUMN_NAME = e.column_name
WHERE c.COLUMN_NAME IS NULL
ORDER BY e.table_name, e.column_name;

-- Done.
-- After running this script: restart/redeploy your Node app so Sequelize reconnects to fresh schema.
