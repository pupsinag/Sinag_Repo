# 🔧 Persistent File Storage - Verification & Activation Guide

## Status Check ✅

Your deployment already has:
- ✅ Database schema with `file_content` column
- ✅ Model definition updated
- ✅ Upload controller stores to database
- ✅ Download controller serves from database

**Now we need to verify it's working and migrate existing files.**

---

## 1️⃣ Verify Files Are Being Saved (Test Upload)

### Step 1: Login as an Intern and Upload a Document

1. Go to your deployed application
2. Login as an intern user
3. Upload a test document (PDF or image)
4. Check browser console for upload success

### Step 2: Check if File is in Database

Connect to your MySQL database and run:

```sql
-- Check if file_content is populated for new uploads
SELECT 
  id,
  intern_id,
  document_type,
  file_name,
  file_size,
  CHAR_LENGTH(file_content) as stored_bytes,
  file_mime_type,
  uploaded_date,
  CASE 
    WHEN file_content IS NOT NULL AND CHAR_LENGTH(file_content) > 0 THEN '✅ IN DATABASE'
    ELSE '❌ NOT IN DATABASE'
  END as status
FROM intern_documents
ORDER BY uploaded_date DESC
LIMIT 10;
```

**Expected Result:**
- `✅ IN DATABASE` status for recently uploaded files
- `stored_bytes` should match `file_size`
- `file_mime_type` should be set (e.g., "application/pdf")

### Step 3: Check Server Logs

When you download that file, look for this log message in your server:

```
[downloadInternDoc] 📦 Serving file from DATABASE
```

If you see this, **files are being served from the database!** 🎉

---

## 2️⃣ Migrate Existing Files (If You Have Old Files)

If you have files that were uploaded BEFORE the database storage was implemented, you need to migrate them.

### Option A: Automatic Migration Script (Recommended)

```bash
npm run migrate:020
```

This will:
- Find all files in `/uploads` folder
- Read their content
- Store in database
- Update database records

### Option B: Manual Migration (if Option A doesn't work)

Create a file `migrate_files_manually.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { InternDocuments } = require('./models');

async function migrateFilesToDatabase() {
  try {
    console.log('🔄 Starting file migration...\n');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('No uploads directory found');
      return;
    }
    
    const files = fs.readdirSync(uploadsDir);
    console.log(`Found ${files.length} files to migrate\n`);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const filename of files) {
      const filePath = path.join(uploadsDir, filename);
      
      // Skip directories
      if (!fs.statSync(filePath).isFile()) continue;
      
      try {
        // Find database record
        const doc = await InternDocuments.findOne({
          where: { file_path: filename }
        });
        
        if (!doc) {
          console.log(`⚠️  No DB record for: ${filename}`);
          skipCount++;
          continue;
        }
        
        // Skip if already migrated
        if (doc.file_content && doc.file_content.length > 0) {
          console.log(`✓ Already migrated: ${filename}`);
          skipCount++;
          continue;
        }
        
        // Read file and migrate
        const fileContent = fs.readFileSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        
        const mimeTypes = {
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        
        const fileMimeType = mimeTypes[ext] || 'application/octet-stream';
        
        // Update database
        await doc.update({
          file_content: fileContent,
          file_mime_type: fileMimeType,
        });
        
        console.log(`📦 Migrated: ${filename}`);
        successCount++;
      } catch (err) {
        console.error(`❌ Error migrating ${filename}:`, err.message);
        skipCount++;
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${successCount}`);
    console.log(`   Skipped: ${skipCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run migration
migrateFilesToDatabase();
```

Then run:
```bash
node migrate_files_manually.js
```

---

## 3️⃣ Verify Everything Works

### Test Checklist

- [ ] **Upload Test**: Upload a new file as an intern
  - Check database: `SELECT * FROM intern_documents WHERE document_type = 'resume' ORDER BY uploaded_date DESC LIMIT 1;`
  - Verify: `file_content` is NOT NULL and has data

- [ ] **Download Test**: Download that file as an adviser
  - Check server logs for: `📦 Serving file from DATABASE`
  - Verify: File downloads correctly

- [ ] **Redeployment Test**:
  - Stop the server
  - Delete the `/uploads` folder (Optional but recommended)
  - Restart the server
  - Try downloading the old file
  - Verify: File still downloads (from database!)

- [ ] **Check Existing Files**:
  ```sql
  SELECT COUNT(*) as total_files,
         COUNT(CASE WHEN file_content IS NOT NULL THEN 1 END) as in_database,
         COUNT(CASE WHEN file_content IS NULL THEN 1 END) as missing_content
  FROM intern_documents;
  ```
  - `in_database` should be close to `total_files`

---

## 4️⃣ Common Issues & Solutions

### Issue: Files aren't appearing in database

**Check 1:** Verify column exists
```sql
DESC intern_documents;
-- Look for file_content column
```

**Check 2:** Check server logs during upload
```
Look for: 📁 [FILE CONTENT] Read file successfully:
```

**Check 3:** Verify file was uploaded
```bash
ls -la uploads/  # Check if file exists on disk
```

### Issue: Download fails with "file not found"

**Check:** File should be in database
```sql
SELECT id, document_type, 
       CASE WHEN file_content IS NOT NULL THEN 'YES' ELSE 'NO' END as has_content
FROM intern_documents 
WHERE intern_id = 123;
```

If `has_content` is NO, run migration:
```bash
npm run migrate:020
```

### Issue: Database getting too large

**Solution:** Limit file sizes in upload (frontend/backend)
- Max file size: 50-100 MB per file
- Max request size: 110 MB

---

## 5️⃣ How to Verify It's Working

### Quick Test Query

```sql
-- Run this to see file persistence status
SELECT 
  COUNT(*) as total_documents,
  SUM(CHAR_LENGTH(file_content)) / 1024 / 1024 as database_size_mb,
  MIN(uploaded_date) as oldest_file,
  MAX(uploaded_date) as newest_file
FROM intern_documents
WHERE file_content IS NOT NULL;
```

### Expected Output After Migration

```
total_documents: 45
database_size_mb: 250.45
oldest_file: 2025-11-15
newest_file: 2026-02-26
```

---

## 6️⃣ Monitor Logs

### To confirm the system is working, watch for these logs:

**On Upload:**
```
📁 [FILE CONTENT] Read file successfully: { size: 2048000, mimeType: 'application/pdf' }
📝 [SAVE] Will save to DB: { file_content: <Buffer>, file_mime_type: 'application/pdf' }
✅ Document record updated successfully
```

**On Download:**
```
[downloadInternDoc] 📦 Serving file from DATABASE
```

---

## 7️⃣ After Verification - Next Steps

### Option 1: Keep Files in Both Places (Safest)
- Leave `/uploads` folder as backup
- Files also in database
- Best for safety during transition

### Option 2: Database-Only (Recommended After Testing)
- After migration is verified working
- Delete `/uploads` folder contents
- Keep the folder structure for new uploads (as fallback)
- Database becomes primary

```bash
# Backup first!
cp -r uploads uploads.backup

# Delete old files (ONLY after verifying migration)
rm -rf uploads/*

# Folder stays but empty - perfect for fallback
```

---

## 💡 Quick Reference

| Action | Command |
|--------|---------|
| **Migrate files** | `npm run migrate:020` |
| **Check status** | MySQL query in Section 5 |
| **View logs** | Check console when uploading/downloading |
| **Test upload** | Upload as intern, check DB |
| **Test download** | Download as adviser, check logs |
| **Backup files** | `cp -r uploads uploads.backup` |

---

## 🎯 Success Indicators

You'll know it's working when:

✅ New files uploaded → appear in `file_content` column  
✅ Download logs show → "📦 Serving file from DATABASE"  
✅ After redeployment → files still downloadable  
✅ `/uploads` folder can be deleted → files still work  
✅ Database query shows → many rows with `file_content` NOT NULL  

---

## Need Help?

If something isn't working:

1. **Check server is running** - See any console errors?
2. **Verify database connection** - Can you access MySQL?
3. **Check migrations have run** - Are the columns in the table?
4. **Review logs during upload** - What does the server log show?
5. **Check database directly** - Is the file_content data there?

Run this diagnostic query:

```sql
SELECT 
  id,
  document_type,
  file_name,
  CHAR_LENGTH(file_content) as bytes,
  uploaded_date,
  'FILE_INFO' as check_type
FROM intern_documents
WHERE intern_id = YOUR_INTERN_ID
ORDER BY uploaded_date DESC
LIMIT 5;
```

Replace `YOUR_INTERN_ID` with an actual intern ID.

---

**You're almost there! Just verify the implementation is working, migrate existing files, and you're done!** 🚀
