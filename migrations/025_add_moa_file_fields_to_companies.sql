-- Migration 025: Add MOA file storage fields to companies table
-- Consolidate company MOA storage into the companies table instead of separate company_documents

ALTER TABLE `companies` 
ADD COLUMN `file_content` LONGBLOB NULL COMMENT 'MOA file content stored as binary data for persistence across redeployments' AFTER `moaFile`,
ADD COLUMN `file_mime_type` VARCHAR(100) DEFAULT 'application/pdf' NULL COMMENT 'MIME type of the uploaded MOA file' AFTER `file_content`,
ADD COLUMN `file_upload_date` DATETIME NULL COMMENT 'When the MOA file was uploaded' AFTER `file_mime_type`,
ADD COLUMN `moa_status` VARCHAR(50) DEFAULT 'pending' NULL COMMENT 'Status of MOA (e.g., pending, active, expired, renewing)' AFTER `file_upload_date`;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS `idx_companies_moa_status` ON `companies`(`moa_status`);
CREATE INDEX IF NOT EXISTS `idx_companies_file_upload_date` ON `companies`(`file_upload_date`);

-- Commit the migration
COMMIT;
