-- SINAG DB schema audit + dependency map + compatibility fixes
-- Target: MySQL/MariaDB (Hostinger/phpMyAdmin)
-- Usage: Run section by section in phpMyAdmin SQL tab.

-- =============================================
-- 0) Confirm active database
-- =============================================
SELECT DATABASE() AS active_database;

-- =============================================
-- 1) Column naming style audit (camelCase vs snake_case)
-- =============================================
SELECT
  c.TABLE_NAME,
  c.COLUMN_NAME,
  CASE
    WHEN c.COLUMN_NAME REGEXP '[A-Z]' THEN 'camelCase_or_MixedCase'
    WHEN c.COLUMN_NAME LIKE '%\\_%' ESCAPE '\\' THEN 'snake_case'
    ELSE 'lowercase_plain'
  END AS naming_style,
  c.DATA_TYPE,
  c.IS_NULLABLE,
  c.COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE c.TABLE_SCHEMA = DATABASE()
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;

-- =============================================
-- 2) Quick check for expected columns used by app
-- =============================================
SELECT *
FROM (
  SELECT 'users' AS table_name, 'email' AS required_column UNION ALL
  SELECT 'users', 'password' UNION ALL
  SELECT 'users', 'role' UNION ALL
  SELECT 'users', 'firstName' UNION ALL
  SELECT 'users', 'lastName' UNION ALL
  SELECT 'users', 'yearSection' UNION ALL
  SELECT 'users', 'forcePasswordChange' UNION ALL
  SELECT 'users', 'createdAt' UNION ALL

  SELECT 'companies', 'name' UNION ALL
  SELECT 'companies', 'email' UNION ALL
  SELECT 'companies', 'password' UNION ALL
  SELECT 'companies', 'forcePasswordChange' UNION ALL
  SELECT 'companies', 'createdAt' UNION ALL

  SELECT 'interns', 'user_id' UNION ALL
  SELECT 'interns', 'adviser_id' UNION ALL
  SELECT 'interns', 'supervisor_id' UNION ALL
  SELECT 'interns', 'company_id' UNION ALL
  SELECT 'interns', 'year_section' UNION ALL
  SELECT 'interns', 'createdAt' UNION ALL

  SELECT 'intern_daily_logs', 'intern_id' UNION ALL
  SELECT 'intern_daily_logs', 'log_date' UNION ALL
  SELECT 'intern_daily_logs', 'supervisor_status' UNION ALL
  SELECT 'intern_daily_logs', 'adviser_status' UNION ALL
  SELECT 'intern_daily_logs', 'supervisor_approved_at' UNION ALL
  SELECT 'intern_daily_logs', 'adviser_approved_at' UNION ALL
  SELECT 'intern_daily_logs', 'createdAt' UNION ALL

  SELECT 'hte_evaluations', 'intern_id' UNION ALL
  SELECT 'hte_evaluations', 'company_id' UNION ALL
  SELECT 'hte_evaluations', 'ratings' UNION ALL
  SELECT 'hte_evaluations', 'createdAt'
) req
LEFT JOIN INFORMATION_SCHEMA.COLUMNS c
  ON c.TABLE_SCHEMA = DATABASE()
 AND c.TABLE_NAME = req.table_name
 AND c.COLUMN_NAME = req.required_column
WHERE c.COLUMN_NAME IS NULL
ORDER BY req.table_name, req.required_column;

-- If this returns rows, those are missing columns likely causing fetch errors.

-- =============================================
-- 3) All FK dependencies (parent/child map)
-- =============================================
SELECT
  kcu.TABLE_NAME AS child_table,
  kcu.COLUMN_NAME AS child_column,
  kcu.REFERENCED_TABLE_NAME AS parent_table,
  kcu.REFERENCED_COLUMN_NAME AS parent_column,
  rc.UPDATE_RULE,
  rc.DELETE_RULE,
  kcu.CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
  ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
 AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE kcu.TABLE_SCHEMA = DATABASE()
  AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY child_table, kcu.CONSTRAINT_NAME;

-- =============================================
-- 4) Generate SQL to add compatibility `created_at` where app/models may expect it
--    (This section prints ALTER/UPDATE SQL; copy and run generated statements)
-- =============================================
SELECT CONCAT('-- ', t.table_name) AS info
FROM (
  SELECT 'companies' AS table_name
  UNION ALL SELECT 'interns'
  UNION ALL SELECT 'intern_daily_logs'
  UNION ALL SELECT 'hte_evaluations'
) t;

SELECT CONCAT(
  'ALTER TABLE `', t.table_name, '` ADD COLUMN `created_at` DATETIME NULL;'
) AS sql_to_run
FROM (
  SELECT 'companies' AS table_name
  UNION ALL SELECT 'interns'
  UNION ALL SELECT 'intern_daily_logs'
  UNION ALL SELECT 'hte_evaluations'
) t
WHERE NOT EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS c
  WHERE c.TABLE_SCHEMA = DATABASE()
    AND c.TABLE_NAME = t.table_name
    AND c.COLUMN_NAME = 'created_at'
);

SELECT CONCAT(
  'UPDATE `', t.table_name, '` SET `created_at` = `createdAt` WHERE `created_at` IS NULL;'
) AS sql_to_run
FROM (
  SELECT 'companies' AS table_name
  UNION ALL SELECT 'interns'
  UNION ALL SELECT 'intern_daily_logs'
  UNION ALL SELECT 'hte_evaluations'
) t
WHERE EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS c
  WHERE c.TABLE_SCHEMA = DATABASE()
    AND c.TABLE_NAME = t.table_name
    AND c.COLUMN_NAME = 'created_at'
)
AND EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS c
  WHERE c.TABLE_SCHEMA = DATABASE()
    AND c.TABLE_NAME = t.table_name
    AND c.COLUMN_NAME = 'createdAt'
);

-- =============================================
-- 5) Generate SQL to add compatibility `yearSection` <-> `year_section` aliases
--    for tables where app/model may use one but DB has the other.
-- =============================================
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'users' AND c.COLUMN_NAME = 'yearSection'
    )
    AND NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'users' AND c.COLUMN_NAME = 'year_section'
    )
    THEN 'ALTER TABLE `users` ADD COLUMN `year_section` VARCHAR(50) NULL;'
    ELSE '-- users: no add needed'
  END AS sql_to_run
UNION ALL
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'users' AND c.COLUMN_NAME = 'yearSection'
    )
    AND EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'users' AND c.COLUMN_NAME = 'year_section'
    )
    THEN 'UPDATE `users` SET `year_section` = `yearSection` WHERE `year_section` IS NULL;'
    ELSE '-- users: no sync needed'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'interns' AND c.COLUMN_NAME = 'year_section'
    )
    AND NOT EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'interns' AND c.COLUMN_NAME = 'yearSection'
    )
    THEN 'ALTER TABLE `interns` ADD COLUMN `yearSection` VARCHAR(50) NULL;'
    ELSE '-- interns: no add needed'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'interns' AND c.COLUMN_NAME = 'year_section'
    )
    AND EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = 'interns' AND c.COLUMN_NAME = 'yearSection'
    )
    THEN 'UPDATE `interns` SET `yearSection` = `year_section` WHERE `yearSection` IS NULL;'
    ELSE '-- interns: no sync needed'
  END;

-- =============================================
-- 6) Hard check for data issues that can break fetch/auth
-- =============================================
SELECT id, email
FROM users
WHERE email IS NULL OR TRIM(email) = '';

SELECT id, email, role
FROM users
WHERE role IS NULL OR TRIM(role) = '';

-- Done.
