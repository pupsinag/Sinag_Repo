-- Migration: Add missing columns to intern_evaluations table
-- This migration safely adds missing columns if they don't already exist

-- Add internName column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS internName VARCHAR(255);

-- Add section column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS section VARCHAR(255);

-- Add hteName column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS hteName VARCHAR(255);

-- Add jobDescription column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS jobDescription TEXT;

-- Add totalScore column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS totalScore FLOAT;

-- Add technicalDetails column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS technicalDetails TEXT;

-- Add recommendations column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS recommendations TEXT;

-- Add remarks column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Add evaluator column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS evaluator VARCHAR(255);

-- Add designation column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS designation VARCHAR(255);

-- Add date column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS date DATE;

-- Add conforme column if it doesn't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS conforme VARCHAR(255);

-- Add timestamps if they don't exist
ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE intern_evaluations
ADD COLUMN IF NOT EXISTS updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
