-- =====================================================
-- Migration: Link Interns to Advisers (SQL Version)
-- =====================================================
-- 
-- This migration links existing interns to their advisers
-- based on matching program and year_section.
--
-- Run this script directly in your database:
-- mysql -u [user] -p [database_name] < 020_link_interns_to_advisers.sql
--

-- =====================================================
-- STEP 1: Show current state (before migration)
-- =====================================================
SELECT 
    CONCAT('Total Interns: ', COUNT(*)) as status
FROM interns;

SELECT 
    COUNT(*) as interns_without_adviser_id
FROM interns
WHERE adviser_id IS NULL;

-- =====================================================
-- STEP 2: Link interns to advisers
-- =====================================================
-- Update interns to link to adviser if program and year_section match

UPDATE interns i
INNER JOIN users adviser ON (
    adviser.role = 'adviser'
    AND adviser.program = i.program
    AND REPLACE(LOWER(COALESCE(adviser.yearSection, '')), ' ', '') = 
        REPLACE(LOWER(COALESCE(i.year_section, '')), ' ', '')
)
SET i.adviser_id = adviser.id
WHERE i.adviser_id IS NULL;

-- =====================================================
-- STEP 3: Show results (after migration)
-- =====================================================
SELECT 
    COUNT(*) as interns_with_adviser_id
FROM interns
WHERE adviser_id IS NOT NULL;

SELECT 
    COUNT(*) as interns_still_without_adviser_id
FROM interns
WHERE adviser_id IS NULL;

-- =====================================================
-- STEP 4: Show details of linked interns (sample)
-- =====================================================
SELECT 
    i.id,
    iu.firstName,
    iu.lastName,
    i.program,
    i.year_section,
    i.adviser_id,
    au.firstName as adviser_firstName,
    au.lastName as adviser_lastName
FROM interns i
LEFT JOIN users iu ON i.user_id = iu.id
LEFT JOIN users au ON i.adviser_id = au.id
WHERE i.adviser_id IS NOT NULL
LIMIT 10;

-- =====================================================
-- Done! Check the results above
-- =====================================================
