-- Migration 023: Create company_documents table for persistent file storage
-- This allows MOA and other company documents to persist across redeployments

CREATE TABLE IF NOT EXISTS `company_documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT UNSIGNED NOT NULL,
  `document_type` VARCHAR(100) NOT NULL COMMENT 'Type of document (e.g., moa, agreement, certificate)',
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) COMMENT 'Original file path (for reference)',
  `file_content` LONGBLOB COMMENT 'File content stored as binary data for persistence across redeployments',
  `file_mime_type` VARCHAR(100) DEFAULT 'application/octet-stream' COMMENT 'MIME type of the uploaded file',
  `file_size` BIGINT COMMENT 'File size in bytes',
  `uploaded_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) DEFAULT 'active',
  `remarks` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_company_documents_company` 
    FOREIGN KEY (`company_id`) 
    REFERENCES `companies` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_document_type` (`document_type`),
  INDEX `idx_uploaded_date` (`uploaded_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Persistent file storage for company documents (MOA, agreements, etc)';

-- If companies table has moaFile column, we can add a migration note
-- but we'll keep the old column for backward compatibility
ALTER TABLE `companies` ADD COLUMN `moaFile_new` VARCHAR(255) COMMENT 'File path reference (kept for backward compatibility, use company_documents table instead)' 
AFTER `moaFile`;

-- The actual file content is now stored in company_documents.file_content as LONGBLOB
