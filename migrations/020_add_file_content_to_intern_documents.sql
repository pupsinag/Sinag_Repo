-- Migration: Add file_content and file_size columns to intern_documents
-- Purpose: Store file content in database for Hostinger compatibility
-- Date: 2026-02-26

ALTER TABLE `intern_documents` 
ADD COLUMN `file_content` LONGBLOB NULL AFTER `file_path`,
ADD COLUMN `file_size` INT UNSIGNED NULL AFTER `file_content`;

-- Create index on intern_id for faster queries
ALTER TABLE `intern_documents` ADD INDEX `idx_intern_id` (`intern_id`);
ALTER TABLE `intern_documents` ADD INDEX `idx_document_type` (`document_type`);

COMMIT;
