# SINAG Deployment Strategy & Improvements Guide

## PROJECT CONTEXT
- **Hosting**: Hostinger with phpMyAdmin
- **Database**: MySQL (Hostinger managed)
- **Runtime requirement**: Node.js 18 or higher (the repo includes an `.nvmrc` file and `engines.node` entry for guidance)
- **Account Creation Flow**:
  - Coordinator creates Adviser
  - Adviser creates Intern account
  - Coordinator registers Company
  - Users login with credentials

---

## PROBLEM #1: Adviser Cannot Fetch Submitted Documents

### Root Cause
The endpoint `GET /api/documents/intern-docs/me` only supports fetching documents for the **logged-in user's own intern record**. Advisers need a separate endpoint to access their assigned interns' documents.

### Current Architecture
- ✅ `downloadInternDoc()` - Can download individual documents (has adviser authorization)
- ❌ `getInternDocuments()` - Only works for `req.user.id` (self)
- ❌ No endpoint for advisers to list all interns' documents

### Solution
**Create a new endpoint: `GET /api/documents/intern-docs/adviser/:internId`**

This endpoint will:
1. Check adviser authorization (direct assignment OR program+yearSection match)
2. Return all documents for the requested intern with metadata
3. Check both database storage and filesystem fallback
4. Return document status, file size, upload date

---

## IMPROVEMENT #1: Database Migrations

### Current State
- Using Sequelize ORM with auto-migration
- SQL migration files exist for schema reference
- File storage was using filesystem only → now transitioning to LONGBLOB

### Recommended Improvements

#### 1.1 **Structured SQL Migrations (For Hostinger Compatibility)**
```sql
-- Migration 021: Add document tracking columns
ALTER TABLE intern_documents 
ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed_by INT,
ADD COLUMN IF NOT EXISTS last_accessed_date DATETIME,
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- Migration 022: Add adviser access logs
CREATE TABLE IF NOT EXISTS intern_document_access_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  intern_id INT UNSIGNED NOT NULL,
  accessed_by INT NOT NULL,
  accessed_by_role VARCHAR(50),
  document_type VARCHAR(100),
  access_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
  FOREIGN KEY (accessed_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_intern_access (intern_id),
  INDEX idx_accessed_by (accessed_by)
);
```

#### 1.2 **Best Practices for Hostinger**
1. **Use phpMyAdmin's SQL tab** for running migrations (safer than CLI)
2. **Always backup before migrations**:
   ```sql
   -- Export table before major changes
   -- Menu: Export tab in phpMyAdmin
   ```
3. **Version all migrations** with timestamp
4. **Test on staging** before production

#### 1.3 **Recommended Migration Sequencing**
```
001_initial_schema.sql         ← Already done
013_data_seeding.sql           ← Already done
014_existing_data_migration.sql ← Already done
015_add_missing_intern_evaluation_columns.sql ← Exists
...
020_add_file_content_to_intern_documents.sql ← File storage
021_add_document_tracking.sql ← NEW (audit trail)
022_add_access_logs.sql ← NEW (adviser tracking)
023_add_adviser_assignments.sql ← NEW (explicit relationships)
```

#### 1.4 **Create Migration Script for Hostinger**
```javascript
// migrations/run_migration_hostinger.js
// Designed for Hostinger environment
// No CLI access - uses app connection pool

const sequelize = require('../config/database');

async function runMigration() {
  const queries = [
    // ALTER TABLE statements here
    `ALTER TABLE intern_documents 
     ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0`,
    // etc...
  ];
  
  for (const query of queries) {
    try {
      await sequelize.query(query);
      console.log('✅', query.substring(0, 50));
    } catch (err) {
      console.error('❌', query, err.message);
    }
  }
}
```

---

## IMPROVEMENT #2: File Storage Architecture

### Current Situation
```
📂 File Storage Hybrid Model (PROBLEMATIC for Hostinger)
├── 📄 Database (LONGBLOB) ← Recommended for Hostinger (persistent)
└── 📁 /uploads folder ← RISKY on Hostinger (ephemeral)
```

### Problem on Hostinger
- Shared hosting with **automatic cleanup** of `/uploads` folder on redeployment
- No persistent filesystem mount
- Files lost after each deployment/reset

### Recommended Architecture for Hostinger

#### **Option 1: Database-First (RECOMMENDED)**
```
✅ PROS:
- Single source of truth
- Persists across redeployments
- No filesystem dependencies
- Automatic backups with data
- Multi-server compatible

✅ CONS:
- Slightly slower for large files (100MB+)
- Consumes database storage quota

📊 Suitable for: Most use cases, typical documents (PDF, Word, images)
```

**Implementation:**
```javascript
// middleware/upload.js - Force database-first storage
const storage = multer.memoryStorage(); // Keep in memory, then save to DB

module.exports = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow safe file types
    const allowed = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    const ext = file.originalname.split('.').pop().toLowerCase();
    
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per Hostinger
});
```

#### **Option 2: Cloud Storage (If budget allows)**
```
✅ PROS:
- Unlimited scalability
- CDN for fast delivery
- Automatic backups
- Pro-grade security

Services:
- AWS S3 (enterprise-grade) → Overkill for small deployment
- Cloudinary → Good for images/PDFs, free tier available
- Firebase Storage → Integrates well with Node.js

📊 Suitable for: High file volume, international users, scalability needs
```

#### **Option 3: Hybrid with Fallback**
```
PRIMARY: Database (LONGBLOB)
FALLBACK: Filesystem cache (/uploads)
MONITOR: Track which files are where

⚠️ Note: This adds complexity - not recommended for Hostinger
```

### Migration Strategy: Filesystem → Database

**Step 1: Create migration script**
```javascript
// migrations/create_migration_fs_to_db.js
const fs = require('fs');
const path = require('path');
const { InternDocuments } = require('../models');

async function migrateFilesToDatabase() {
  const uploadsDir = path.join(__dirname, '../uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('✅ No legacy files to migrate');
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files to migrate...`);
  
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    
    try {
      const fileContent = fs.readFileSync(filePath);
      const mimeType = getMimeType(file);
      
      // Find matching document in DB and update
      const docRecord = await InternDocuments.findOne({
        where: { file_path: file }
      });
      
      if (docRecord) {
        await docRecord.update({
          file_content: fileContent,
          file_mime_type: mimeType
        });
        console.log(`✅ ${file} migrated to DB`);
      }
    } catch (err) {
      console.error(`❌ ${file}: ${err.message}`);
    }
  }
  
  console.log('✅ Migration complete');
}

async function runMigration() {
  if (require.main === module) {
    await migrateFilesToDatabase();
    process.exit(0);
  }
}

module.exports = runMigration;
```

**Step 2: Run migration**
```
npm run migrate:021
```

**Step 3: Update download controller**
```javascript
// Always try database first
if (doc.file_content && doc.file_content.length > 0) {
  // Serve from database (ALWAYS prefer this)
  res.send(doc.file_content);
  return;
}

// Fallback to filesystem (legacy support)
if (fs.existsSync(filePath)) {
  res.download(filePath);
  return;
}

// If neither exists, error
res.status(404).json({ message: 'File not found' });
```

### File Storage Checklist for Hostinger
- [ ] Enable LONGBLOB columns in `intern_documents`
- [ ] Disable `/uploads` folder in production (or set to read-only)
- [ ] Run filesystem → database migration
- [ ] Update `downloadInternDoc()` to prefer database
- [ ] Set file size limits (10MB max for documents)
- [ ] Add file upload monitoring/logging
- [ ] Monthly backup of `intern_documents` table

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Fix Adviser Document Access (THIS WEEK)
- [ ] Add new endpoint: `GET /api/documents/intern-docs/adviser/:internId`
- [ ] Add authorization checks (programme + yearSection match)
- [ ] Add to documents.js router
- [ ] Test with adviser accounts
- [ ] Update frontend to use new endpoint

### Phase 2: Migrate to Database Storage (Next 2 weeks)
- [ ] Create migration 021 script
- [ ] Test on staging environment
- [ ] Run migration on Hostinger via phpMyAdmin
- [ ] Verify all files migrated
- [ ] Backup database before/after

### Phase 3: Enhance Migrations (Month 2)
- [ ] Add access logging table
- [ ] Add download tracking
- [ ] Create adviser audit trail
- [ ] Add database validation scripts

### Phase 4: Monitor & Optimize (Ongoing)
- [ ] Monitor database disk usage
- [ ] Review access logs monthly
- [ ] Optimize image compression (Sharp)
- [ ] Set up automated backups

---

## HOSTINGER-SPECIFIC CONFIGURATIONS

### 1. phpMyAdmin Access
```
URL: https://your-domain.hostinger.com/admin/
- Navigate to Databases
- Click phpMyAdmin
- Select your database
- Use SQL tab for migrations
```

### 2. Database Credentials
```
Host: localhost (or your assigned host)
Port: 3306
Database: pup_sinag (or your database name)
Username: your_db_user
Password: Use BASE64 encoded in .env
```

### 3. Environment Variables for Hostinger
```env
DB_HOST=127.0.0.1         # Hostinger local host
DB_PORT=3306
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD_B64=base64encoded_password
NODE_ENV=production
JWT_SECRET=strong_random_secret
```

### 4. File Upload Limits
```
Hostinger typically allows:
- Max upload: 100MB
- Set reasonable limits in code: 10MB per file
- Total storage: Check hosting plan
```

### 5. Auto-Backup Strategy
```
Hostinger provides:
- Weekly automatic backups
- You can also:
  1. Export database monthly via phpMyAdmin
  2. Backup /uploads folder separately
  3. Store copies locally or cloud
```

---

## EXPECTED OUTCOMES

After implementing these improvements:

✅ **Advisers can view all intern documents** (fixed endpoint)
✅ **Files persist across deployments** (database storage)
✅ **Audit trail of document access** (access logs)
✅ **Reduced filesystem dependency** (better for shared hosting)
✅ **Scalable to multiple servers** (database centralized)
✅ **Automatic backups included** (with database backups)

---

## NEXT STEPS

1. **TODAY**: Implement Fix #1 (Adviser endpoint)
2. **TOMORROW**: Test with adviser user
3. **THIS WEEK**: Create migration 021
4. **NEXT WEEK**: Run migration on Hostinger staging
5. **WEEK 3**: Deploy migrations to production
