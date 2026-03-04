-- Migration 021: Add Document Tracking and MIME Type Columns
-- For improved file management, adviser access tracking, and proper file serving
-- Hostinger compatible: Use phpMyAdmin SQL tab to run this

-- Add document tracking and MIME type columns
ALTER TABLE intern_documents 
ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR(100) DEFAULT 'application/octet-stream' AFTER file_content COMMENT 'MIME type of the uploaded file for proper file serving',
ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0 COMMENT 'Number of times document was accessed',
ADD COLUMN IF NOT EXISTS last_accessed_by INT COMMENT 'User ID who last accessed the document',
ADD COLUMN IF NOT EXISTS last_accessed_date DATETIME COMMENT 'When document was last accessed',
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 COMMENT 'Document version number if re-uploaded';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_intern_documents_intern_id ON intern_documents(intern_id);
CREATE INDEX IF NOT EXISTS idx_intern_documents_document_type ON intern_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_intern_documents_uploaded_date ON intern_documents(uploaded_date DESC);

-- Log successful migration
INSERT INTO migration_logs (migration_name, status, executed_at) 
VALUES ('021_add_document_tracking', 'completed', NOW())
ON DUPLICATE KEY UPDATE executed_at = NOW();
