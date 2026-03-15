-- Migration: Remove unique constraint on supervisor email
-- Purpose: Allow multiple supervisors per company to share company email
-- Background: Each supervisor in a company now shares the company's email

-- Check current index name (varies by system)
-- For MySQL, drop the unique constraint on email column
ALTER TABLE supervisors DROP INDEX email;

-- If index name is different, you may need to use:
-- ALTER TABLE supervisors DROP INDEX `email` (if the above fails)
