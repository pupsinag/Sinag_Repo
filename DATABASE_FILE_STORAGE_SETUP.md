# Database File Storage Setup (Hostinger Compatible)

## Problem
Files uploaded to Hostinger are deleted after each deployment because the `/uploads` folder is temporary. This causes missing files even though records exist in the database.

## Solution
Store file content directly in the MySQL database instead of the filesystem.

---

## Step 1: Add Database Columns

Run this SQL in your Hostinger PHPMyAdmin:

```sql
-- Add columns to store file content in database
ALTER TABLE `intern_documents` 
ADD COLUMN `file_content` LONGBLOB NULL AFTER `file_path`,
ADD COLUMN `file_size` INT UNSIGNED NULL AFTER `file_content`;

-- Create indexes for faster queries
ALTER TABLE `intern_documents` ADD INDEX `idx_intern_id` (`intern_id`);
ALTER TABLE `intern_documents` ADD INDEX `idx_document_type` (`document_type`);

COMMIT;
```

**Or** use the migration file:
```bash
node migrate_files_to_db.js
```

---

## Step 2: Deploy Updated Code

The following files have been updated:

- `models/InternDocuments.js` - Added `file_content` and `file_size` fields
- `controllers/internDocsController.js` - Updated upload to save file content to DB
- `controllers/internSubmittedDocumentsController.js` - Updated download to serve from DB

Deploy these changes to Hostinger.

---

## Step 3: Future Uploads

All **new file uploads** will automatically:
1. ✅ Save file content to the database (`file_content` column)
2. ✅ Save file size to the database (`file_size` column)
3. ✅ Keep original filename reference (`file_name`)
4. ✅ Persist through deployments (no more losing files!)

---

## Step 4: Download Files

When downloading documents:
1. First checks for `file_content` in database (Hostinger-friendly)
2. If found, serves directly from MySQL
3. If not found, attempts fallback to disk file

---

## Migrating Old Files (Optional)

If you want to move existing files from disk to database:

```bash
node migrate_old_files_to_db.js
```

This script:
- Finds all files in `/uploads` folder
- Reads each file's content
- Stores it in the corresponding database record
- Updates `file_content` and `file_size` columns

---

## Benefits

| Issue | Before | After |
|-------|--------|-------|
| Redeployment | Files deleted ❌ | Files persist ✅ |
| File storage | Disk dependent | Database stored ✅ |
| Server restart | Files lost ❌ | Always available ✅ |
| Offsite backup | Manual ❌ | Automatic with DB backups ✅ |

---

## Database Space

Each file is stored as BLOB (Binary Large Object):
- LONGBLOB supports up to **4 GB** per file
- Ideal for PDFs, Word docs, images
- Make sure your Hostinger plan has enough MySQL storage

**Check used space:**
```sql
SELECT 
  ROUND(SUM(LENGTH(file_content)) / 1024 / 1024, 2) AS 'Total Size (MB)'
FROM intern_documents 
WHERE file_content IS NOT NULL;
```

---

## Rollback (If Needed)

If you want to go back to disk storage:

```sql
-- Remove the columns
ALTER TABLE `intern_documents` 
DROP COLUMN `file_content`,
DROP COLUMN `file_size`;
```

---

## Troubleshooting

**Q: Files are still not showing up?**
- Make sure the migration SQL was executed
- Check that the columns were added: `DESCRIBE intern_documents;`
- Re-upload files after deployment

**Q: DB is getting too large?**
- Delete old documents: `DELETE FROM intern_documents WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);`
- Archive very old files separately

**Q: Want to keep disk backup too?**
- Files are still written to `/uploads` temporarily
- Now also stored in DB for safety
- Disk files are cleaned up after DB save

---

## Questions?

Check server logs for `[downloadSubmittedDocument]` or `[uploadInternDoc]` messages, which will show:
- Where file came from (database vs disk)
- Any errors during save/load
