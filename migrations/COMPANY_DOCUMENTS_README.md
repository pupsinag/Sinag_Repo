# Company Documents - Persistent File Storage

This implementation adds persistent file storage for company documents (MOA, agreements, certificates, etc.), similar to the intern documents feature.

## What Was Changed

### 1. **New Model: `CompanyDocuments`**
   - File: `models/CompanyDocuments.js`
   - Stores company documents with LONGBLOB file content
   - Persistent across redeployments/restarts
   - Fields:
     - `company_id` - References company
     - `document_type` - Type of document (moa, agreement, etc)
     - `file_name` - Original filename
     - `file_path` - File path reference
     - `file_content` - Binary file data (LONGBLOB) ✅ **PERSISTENT**
     - `file_mime_type` - MIME type for browser display
     - `file_size` - File size in bytes
     - `uploaded_date` - Upload timestamp
     - `status` - Document status (active/inactive)
     - `remarks` - Optional notes

### 2. **New Migration: `023_create_company_documents_table.sql`**
   - Creates `company_documents` table
   - Run this migration to set up the table structure
   - Location: `migrations/023_create_company_documents_table.sql`

### 3. **New Controller: `companyDocumentsController.js`**
   - `uploadCompanyDocument()` - Upload/overwrite company document
   - `getCompanyDocuments()` - List all company documents
   - `downloadCompanyDocument()` - Serve file with inline display
   - `deleteCompanyDocument()` - Delete a document

### 4. **New Routes: `routes/companyDocuments.js`**
   - `POST /api/company-documents/upload` - Upload document with multer
   - `GET /api/company-documents` - List documents
   - `DELETE /api/company-documents/:documentId` - Delete document
   - `GET /api/company-documents/download/:documentId` - Download document
   - All routes protected by `authMiddleware()`

### 5. **Updated: `app.js`**
   - Mounted company documents router at `/api/company-documents`
   - Added route loading with error handling

## How to Use

### Setup (One-time)

1. **Run the migration:**
   ```bash
   node migrations/run_023_migration.js
   ```
   Or manually execute the SQL in phpMyAdmin:
   ```sql
   -- Open migrations/023_create_company_documents_table.sql and run it
   ```

2. **Deploy updated code** to Hostinger:
   ```bash
   git add -A
   git commit -m "Add company documents persistent storage"
   git push origin main
   ```

3. **Restart Node.js app** on Hostinger Control Panel

### Upload a Document

**Request:**
```
POST /api/company-documents/upload
Content-Type: multipart/form-data

{
  file: <binary file content>,
  documentType: "moa" | "agreement" | "certificate" | etc.
}
```

**Response:**
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": 123,
    "documentType": "moa",
    "fileName": "agreement.pdf",
    "uploadedDate": "2026-02-27T10:30:00Z"
  }
}
```

### List Company Documents

**Request:**
```
GET /api/company-documents
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 123,
    "document_type": "moa",
    "file_name": "agreement.pdf",
    "file_mime_type": "application/pdf",
    "file_size": 245678,
    "uploaded_date": "2026-02-27T10:30:00Z",
    "status": "active"
  }
]
```

### Download a Document

**Request:**
```
GET /api/company-documents/download/123
Authorization: Bearer <token>
```

**Response:**
- File served with `Content-Disposition: inline` for browser display
- Opens PDF/images in browser tab
- Document files show "Download" button

### Delete a Document

**Request:**
```
DELETE /api/company-documents/123
Authorization: Bearer <token>
```

## Why This Matters

### Before (Old System)
```
companies.moaFile = "agreement.pdf"  ← Just filename string
         ↓
/uploads/agreement.pdf (filesystem)
         ↓
❌ File lost if server resets or redeployment happens
```

### After (New System)
```
company_documents.file_content = <binary blob>  ← Actual file in database
                 ↓
Database (LONGBLOB storage)
                 ↓
✅ File PERSISTS through redeployment, restart, updates
```

## Key Features

✅ **Persistent Storage** - Files survive redeployments  
✅ **Database-First** - Files stored in LONGBLOB, filesystem is fallback  
✅ **MIME Type Detection** - Correct content-type headers  
✅ **Browser Display** - PDFs/images open inline, can still download  
✅ **Authorization** - Only authenticated companies can access their docs  
✅ **Overwrite Support** - Re-upload same document type to update  
✅ **Backward Compatible** - Old filename column kept for reference  

## File Retention After Deploy

✅ **Redeployment** - Files retained (in database)  
✅ **Code Update** - Files retained (in database)  
✅ **App Restart** - Files retained (in database)  
✅ **Server Restart** - Files retained (in database)  
✅ **Version Update** - Files retained (in database)  

**Only way to lose files:** Manually delete from database or database reset.

## Migration Path (Optional)

To migrate existing MOA files from filesystem to database:

```javascript
// Migration script to copy from companies.moaFile to company_documents
const fs = require('fs');
const path = require('path');
const { Company, CompanyDocuments } = require('../models');

async function migrateExistingMOAs() {
  const companies = await Company.findAll({
    where: { moaFile: { [Op.not]: null } }
  });

  for (const company of companies) {
    const filePath = path.join(__dirname, '../uploads', company.moaFile);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      await CompanyDocuments.create({
        company_id: company.id,
        document_type: 'moa',
        file_name: company.moaFile,
        file_path: company.moaFile,
        file_content: fileContent,
        file_mime_type: 'application/pdf',
        file_size: fileContent.length,
      });
    }
  }
}
```

## Summary

Your company MOA files will now:
- 🗄️ Be stored in the database (persistent)
- 🔄 Survive redeployments
- 🔐 Remain secure and accessible
- 📁 Have automatic MIME type handling
- 🖥️ Display in browser tabs (PDF/images)
