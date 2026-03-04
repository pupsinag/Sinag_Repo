-- Migration 022: Create Intern Document Access Logs Table
-- Tracks adviser access to intern documents for audit trail
-- Hostinger compatible: Use phpMyAdmin SQL tab to run this

CREATE TABLE IF NOT EXISTS intern_document_access_logs (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Primary key',
  intern_id INT UNSIGNED NOT NULL COMMENT 'Reference to intern',
  accessed_by INT NOT NULL COMMENT 'User ID who accessed the document',
  accessed_by_name VARCHAR(255) COMMENT 'Name of accessor for logging',
  accessed_by_role VARCHAR(50) COMMENT 'Role of accessor (adviser, coordinator, etc)',
  document_type VARCHAR(100) COMMENT 'Type of document accessed',
  action VARCHAR(50) COMMENT 'Action performed (view, download, validate)',
  ip_address VARCHAR(45) COMMENT 'IP address of accessor',
  access_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When access occurred',
  
  -- Foreign keys
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
  FOREIGN KEY (accessed_by) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes for queries
  INDEX idx_intern_access (intern_id),
  INDEX idx_accessed_by (accessed_by),
  INDEX idx_access_date (access_date),
  INDEX idx_document_type (document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for document access by advisers and coordinators';

-- Create index for finding all access by a specific adviser
CREATE INDEX IF NOT EXISTS idx_adviser_access ON intern_document_access_logs(accessed_by, access_date DESC);

-- Log successful migration
INSERT INTO migration_logs (migration_name, status, executed_at) 
VALUES ('022_create_access_logs', 'completed', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();
