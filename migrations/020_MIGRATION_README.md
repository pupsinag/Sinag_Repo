# Migration 020: Link Interns to Advisers

## Overview
This migration links existing interns in the database to their advisers based on matching **program** and **year_section**.

## Problem
Previously, when advisers added interns, the `adviser_id` field was not being set. This caused authorization issues when advisers tried to view intern documents.

## Solution
The migration:
1. Updates all interns that have `adviser_id = NULL`
2. Finds matching adviser(s) based on program and year_section
3. Sets the `adviser_id` field for the intern

## How to Run

### Option 1: Using Node.js Script (Recommended if DB is running)
```bash
cd c:\Users\CJ\Sinag_Repo
node run_migration_020.js
```

### Option 2: Using SQL Script (Direct Database)

If your database is hosted remotely or you prefer to run SQL directly:

#### Using MySQL Command Line:
```bash
mysql -h [your_host] -u [your_user] -p [your_password] [your_database] < migrations/020_link_interns_to_advisers.sql
```

#### Using PhpMyAdmin:
1. Go to your hosting control panel (cPanel, Plesk, etc.)
2. Open **PhpMyAdmin**
3. Select your database
4. Click **SQL** tab
5. Copy and paste the contents of `migrations/020_link_interns_to_advisers.sql`
6. Click **Execute**

#### Using Database GUI (MySQL Workbench, etc.):
1. Open your database connection
2. Open the file: `migrations/020_link_interns_to_advisers.sql`
3. Execute the script

## Expected Output

After running the migration, you should see:
- Number of interns linked to advisers
- Number of interns still without matching advisers (if any)
- List of linked interns with their adviser information

## What Gets Updated

For each intern without an `adviser_id`:
- Checks their `program` field
- Checks their `year_section` field
- Finds an adviser with matching program and year_section
- Sets that adviser's ID as the intern's `adviser_id`

## Troubleshooting

**"No adviser found for intern"**
- This means no adviser exists with the same program and year_section
- Either assign the intern manually to an adviser, or create the adviser record first

**"Connection refused" (when using Node script)**
- Ensure your database is running
- Check your `.env` file for correct connection details
- Use the SQL script method instead

## Verification

After running the migration, verify it worked by running in your database:

```sql
-- Should show how many interns now have adviser_id
SELECT COUNT(*) as linked_interns FROM interns WHERE adviser_id IS NOT NULL;

-- Should show 0 if all interns were matched
SELECT COUNT(*) as unlinked_interns FROM interns WHERE adviser_id IS NULL;
```

## Rollback

If you need to undo this migration:

```sql
UPDATE interns SET adviser_id = NULL;
```

(This will only affect records that were set by this migration)
