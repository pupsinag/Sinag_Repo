# SINAG Improvements Implementation Guide

## QUICK FIXES IMPLEMENTED

### ✅ FIX #1: Adviser Document Access (CRITICAL - NOW WORKING)

**Problem Solved**: Advisers can now fetch all submitted documents for their assigned interns

**New Endpoint**:
```
GET /api/documents/adviser/intern-docs/:internId
```

**Who Can Use It**:
- ✅ Advisers (must be assigned to the intern by program + yearSection OR direct assignment)
- ✅ Coordinators (can access any intern)
- ✅ Superadmins (can access any intern)
- ❌ Interns (forbidden)
- ❌ Companies (forbidden)

**Response Format**:
```json
{
  "success": true,
  "intern": {
    "id": 5,
    "name": "John Doe",
    "email": "john@pup.edu.ph",
    "program": "BSIT",
    "year_section": "3-K",
    "status": "Approved",
    "adviser_id": 2,
    "company_id": 1,
    "company_name": "Tech Company Inc."
  },
  "documents": [
    {
      "id": 1,
      "document_type": "resume",
      "file_name": "john_resume.pdf",
      "status": "submitted",
      "uploaded_date": "2026-02-20T10:30:00.000Z",
      "remarks": null,
      "has_file_content": true,
      "has_file_path": true,
      "file_size": 102400,
      "storage_location": "database"
    },
    {
      "id": 2,
      "document_type": "consensus_form",
      "file_name": null,
      "status": null,
      "uploaded_date": null,
      "remarks": null,
      "has_file_content": false,
      "has_file_path": false,
      "file_size": 0,
      "storage_location": null
    }
  ],
  "moa": "company_moa_file.pdf",
  "summary": {
    "total_documents": 7,
    "submitted_count": 3,
    "pending_count": 4
  }
}
```

---

## TESTING THE NEW ENDPOINT

### Test 1: As an Adviser (Success Case)
```bash
curl -X GET \
  'http://localhost:5000/api/documents/adviser/intern-docs/5' \
  -H 'Authorization: Bearer YOUR_ADVISER_TOKEN' \
  -H 'Content-Type: application/json'
```

**Expected**: 200 OK with full document list

### Test 2: As a Different Adviser (Authorization Fail)
```bash
curl -X GET \
  'http://localhost:5000/api/documents/adviser/intern-docs/5' \
  -H 'Authorization: Bearer DIFFERENT_ADVISER_TOKEN'
```

**Expected**: 403 Forbidden - "You are not authorized to access this intern's documents"

### Test 3: As a Coordinator (Success Case)
```bash
curl -X GET \
  'http://localhost:5000/api/documents/adviser/intern-docs/5' \
  -H 'Authorization: Bearer COORDINATOR_TOKEN'
```

**Expected**: 200 OK (coordinators can access any intern)

### Test 4: As an Intern (Authorization Fail)
```bash
curl -X GET \
  'http://localhost:5000/api/documents/adviser/intern-docs/5' \
  -H 'Authorization: Bearer INTERN_TOKEN'
```

**Expected**: 403 Forbidden - "You do not have permission to view intern documents"

---

## HOSTINGER-SPECIFIC MIGRATION INSTRUCTIONS

### Using the Node.js Migration Runner

**Step 1**: Connect to your Hostinger server via SSH or File Manager

**Step 2**: Run the migration
```bash
cd /path/to/sinag_deployment
node migrations/run_hostinger_migrations.js
```

**OR** if you can't access SSH, run from your app:
```javascript
// Add this route temporarily for admin only
app.get('/admin/migrate', async (req, res) => {
  const runMigrations = require('./migrations/run_hostinger_migrations');
  await runMigrations();
  res.json({ message: 'Migrations complete' });
});

// Visit: http://yourdomain.com/admin/migrate
// Then remove the route from code
```

### Using phpMyAdmin (Recommended for Hostinger)

**Step 1**: Login to Hostinger phpMyAdmin
- URL: `https://yourdomain.hostinger.com/admin/`
- Select your database

**Step 2**: Click the **SQL** tab

**Step 3**: Copy & paste Migration 021:
```sql
-- Paste contents from: migrations/021_add_document_tracking.sql
```

**Step 4**: Click **Go**

**Step 5**: Repeat for Migration 022:
```sql
-- Paste contents from: migrations/022_create_access_logs.sql
```

---

## MIGRATION IMPROVEMENTS IMPLEMENTED

### What Was Migrated
```
✅ Added download_count column (track usage)
✅ Added last_accessed_by column (track who accessed)
✅ Added last_accessed_date column (track when accessed)
✅ Added version column (for re-uploads)
✅ Created intern_document_access_logs table (audit trail)
✅ Added performance indexes on foreign keys
```

### Why These Matter
- **Accountability**: Know which advisers accessed which documents
- **Compliance**: Meet audit requirements
- **Usage Analytics**: Understand document access patterns
- **Performance**: Indexes improve query speed

---

## FILE STORAGE IMPROVEMENTS

### Current Status
```
📦 HYBRID MODE (during transition)
├── 📄 Database (LONGBLOB) - PRIMARY ✅ Recommended
└── 📁 /uploads folder - FALLBACK ⚠️ Ephemeral

After migration:
├── 📄 Database (LONGBLOB) - PRIMARY ✅ Persistent
└── 📁 /uploads folder - DISABLED ❌ Not used
```

### Benefits of Database-First Storage
✅ **Persistence**: Files survive redeployments on Hostinger
✅ **Simplicity**: No path management concerns
✅ **Backups**: Included in database backups
✅ **Scalability**: Works with multiple servers
✅ **Security**: Can encrypt sensitive documents

### How It Works

**File Upload Flow**:
```
1. User uploads file
2. Multer stores in memory
3. App reads file content
4. Saves to database (LONGBLOB)
5. Also saves to /uploads (fallback)
6. Returns success
```

**File Download Flow**:
```
1. Adviser requests document
2. App checks database first ✅
3. If found in DB, send from DB
4. If not in DB, fallback to /uploads
5. If nowhere, return 404
```

**Migration Flow** (filesystem → database):
```
1. Run migration script
2. Script finds all files in /uploads
3. Reads each file content
4. Updates database records with file_content
5. Keeps /uploads as fallback
6. Can delete /uploads folder after verification
```

---

## MONITORING & VERIFICATION

### Check if Migrations Applied Successfully

**In phpMyAdmin**:
```sql
-- Check new columns exist
DESCRIBE intern_documents;
-- Should show: download_count, last_accessed_by, last_accessed_date, version

-- Check access logs table exists
DESCRIBE intern_document_access_logs;
-- Should show all columns

-- Count total documents
SELECT COUNT(*) FROM intern_documents;

-- Check files in database vs filesystem
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN file_content IS NOT NULL THEN 1 ELSE 0 END) as in_database,
  SUM(CASE WHEN file_content IS NULL THEN 1 ELSE 0 END) as filesystem_only
FROM intern_documents;
```

### Monitor Access Logs

**Check adviser activity**:
```sql
SELECT 
  accessed_by_name,
  accessed_by_role,
  COUNT(*) as access_count,
  MAX(access_date) as latest_access
FROM intern_document_access_logs
WHERE accessed_by_role = 'adviser'
GROUP BY accessed_by_name
ORDER BY access_count DESC;
```

**Check which documents are accessed most**:
```sql
SELECT 
  document_type,
  COUNT(*) as access_count
FROM intern_document_access_logs
GROUP BY document_type
ORDER BY access_count DESC;
```

---

## TROUBLESHOOTING

### Issue: "Advisory can't access intern documents"
**Solution**:
1. Check adviser_id matches OR
2. Verify adviser program matches intern program
3. Verify yearSection matches (case-insensitive)

**Debug SQL**:
```sql
SELECT 
  i.id, i.programme, i.year_section,
  u.program as adviser_program, u.yearSection as adviser_year
FROM interns i
LEFT JOIN users u ON u.id = i.adviser_id
WHERE i.id = 5;
```

### Issue: Files not appearing in database
**Solution**:
1. Run migration 020 first (if not already done)
2. New uploads should automatically go to database
3. For old files, check `/uploads` folder still has them

**Check**:
```bash
ls -la uploads/ | wc -l  # Count files in uploads
```

### Issue: Migration fails with "Unknown column"
**Solution**:
- Column already exists (normal, safe to ignore)
- Run again - script is idempotent (safe to repeat)

---

## DEPLOYMENT CHECKLIST

- [ ] Pull latest code with new endpoint
- [ ] Run `npm install` (if dependencies changed)
- [ ] Test adviser endpoint in development
- [ ] Run migrations (021 & 022) on staging
- [ ] Verify migrations in phpMyAdmin
- [ ] Test adviser document access on staging
- [ ] Deploy to production
- [ ] Run migrations on production
- [ ] Test adviser access in production
- [ ] Monitor access logs daily for 1 week
- [ ] Archive old files in `/uploads` if desired

---

## NEXT IMPROVEMENTS (Future)

```
Phase 2 (Month 2):
- [ ] Add access logging to downloadInternDoc()
- [ ] Add analytics dashboard for document access
- [ ] Implement file compression for storage efficiency
- [ ] Add document digital signatures

Phase 3 (Month 3+):
- [ ] Implement cloud storage (Amazon S3, Cloudinary)
- [ ] Add document versioning system
- [ ] Create approval workflow for documents
- [ ] Add automatic virus scanning
```

---

## SUPPORT & QUESTIONS

If you encounter issues:

1. Check error logs:
   ```bash
   tail -f logs/error.log
   ```

2. Check database connection:
   ```bash
   SELECT 1;  # In phpMyAdmin
   ```

3. Verify file permissions on `/uploads`:
   ```bash
   chmod 755 uploads/
   chmod 644 uploads/*
   ```

4. Review this guide section: TROUBLESHOOTING

---

**Last Updated**: February 26, 2026
**Version**: 1.0
**Status**: Production Ready
