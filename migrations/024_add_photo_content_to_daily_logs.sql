-- Migration 024: Add photo_content column to intern_daily_logs for persistent image storage
-- Stores actual image data in database so photos persist across redeployments

ALTER TABLE `intern_daily_logs` 
ADD COLUMN `photo_content` JSON COMMENT 'Array of image binary data (BLOB) for persistence across redeployments' AFTER `photo_path`;

-- Add indexes for performance
ALTER TABLE `intern_daily_logs` 
ADD INDEX `idx_intern_id_date` (`intern_id`, `log_date`),
ADD INDEX `idx_log_date` (`log_date`);
