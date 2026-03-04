-- Migration 020: Add file_content column to intern_documents for persistent file storage
-- Purpose: Store file content in the database so files persist across redeployments

ALTER TABLE intern_documents 
ADD COLUMN file_content LONGBLOB NULL COMMENT 'File content stored as binary data for persistence across redeployments';

-- Add an index on intern_id for faster lookups
ALTER TABLE intern_documents 
ADD INDEX idx_intern_id_document_type (intern_id, document_type);

-- Add MIME type column to help with file serving
ALTER TABLE intern_documents 
ADD COLUMN file_mime_type VARCHAR(100) NULL DEFAULT 'application/octet-stream' COMMENT 'MIME type of the uploaded file';

COMMIT;
