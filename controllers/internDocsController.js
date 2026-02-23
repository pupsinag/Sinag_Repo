/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');

const { Intern, Company, InternDocuments } = require('../models');

/* =========================
   UPLOAD / UPDATE INTERN DOCUMENT
========================= */
// POST /api/auth/intern-docs/upload
async function uploadInternDoc(req, res) {
  try {
    console.log('[DEBUG] uploadInternDoc - req.user:', req.user?.id);
    console.log('[DEBUG] uploadInternDoc - req.file:', req.file?.filename);
    console.log('[DEBUG] uploadInternDoc - req.body:', req.body);

    const file = req.file;

    if (!file) {
      console.error('❌ No file provided in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Verify user is authenticated
    if (!req.user || !req.user.id) {
      console.error('❌ User not authenticated or missing user data');
      return res.status(401).json({ message: 'User authentication failed' });
    }

    if (file.originalname.toLowerCase().includes('moa')) {
      return res.status(403).json({
        message: 'MOA is provided by the company and cannot be uploaded by interns',
      });
    }

    /* =========================
       FIND INTERN
    ========================= */
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      console.error('❌ Intern not found for user_id:', req.user.id);
      return res.status(404).json({ message: 'Intern not found' });
    }

    /* =========================
       GET COLUMN FROM REQUEST BODY
    ========================= */
    const targetColumn = req.body.column;

    if (!targetColumn) {
      return res.status(400).json({
        message: 'Document type not specified',
      });
    }

    const validColumns = ['notarized_agreement', 'medical_cert', 'insurance', 'resume', 'cor', 'consent_form', 'portfolio'];
    if (!validColumns.includes(targetColumn)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    /* =========================
       DELETE OLD FILE (IF ANY)
    ========================= */
    const existingDoc = await InternDocuments.findOne({
      where: { intern_id: intern.id, document_type: targetColumn },
    });

    if (existingDoc && existingDoc.file_path) {
      const oldPath = path.join(__dirname, '..', 'uploads', existingDoc.file_path);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
          console.log('✅ Deleted old file:', existingDoc.file_path);
        } catch (err) {
          console.warn('⚠️ Failed to delete old file:', err.message);
        }
      }
    }

    /* =========================
       CREATE OR UPDATE DOC RECORD
    ========================= */
    const docData = {
      intern_id: intern.id,
      document_type: targetColumn,
      file_name: file.originalname,
      file_path: file.filename,
      uploaded_date: new Date(),
      status: 'Pending',
    };

    let docs;
    try {
      if (existingDoc) {
        console.log('📝 Updating existing document record:', { intern_id: intern.id, document_type: targetColumn });
        await existingDoc.update(docData);
        docs = existingDoc;
        console.log('✅ Document record updated successfully');
      } else {
        console.log('📝 Creating new document record:', { intern_id: intern.id, document_type: targetColumn });
        docs = await InternDocuments.create(docData);
        console.log('✅ Document record created successfully with ID:', docs.id);
      }
    } catch (dbErr) {
      console.error('❌ DATABASE ERROR when saving document:', dbErr.message);
      console.error('   Full error:', dbErr);
      throw dbErr;
    }

    // Verify document was saved
    const verifyDoc = await InternDocuments.findOne({
      where: { intern_id: intern.id, document_type: targetColumn },
    });

    if (!verifyDoc) {
      console.error('❌ CRITICAL: Document was not found in database after save!');
      return res.status(500).json({
        message: 'Document upload failed - could not verify save',
        error: 'Database save verification failed'
      });
    }

    console.log('✅ Document verified in database:', {
      id: verifyDoc.id,
      intern_id: verifyDoc.intern_id,
      document_type: verifyDoc.document_type,
      file_path: verifyDoc.file_path,
    });

    // Maintain backward-compatible response shape for the frontend
    return res.json({
      message: 'Document uploaded successfully',
      column: verifyDoc.document_type,
      file: verifyDoc.file_path,                        // legacy frontend expects `file`
      document: {
        id: verifyDoc.id,
        document_type: verifyDoc.document_type,
        file_name: verifyDoc.file_name,
        file_path: verifyDoc.file_path,
        uploaded_date: verifyDoc.uploaded_date,
        status: verifyDoc.status,
      }
    });
  } catch (err) {
    console.error('❌ UPLOAD INTERN DOC ERROR:', err.message);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({
      message: 'Failed to upload document',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

/* =========================
   GET INTERN DOCUMENTS
========================= */
// GET /api/auth/intern-docs/me
async function getInternDocuments(req, res) {
  try {
    console.log('[getInternDocuments] Fetching for user_id:', req.user.id);
    
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['moaFile'],
          required: false,
        },
      ],
    });

    if (!intern) {
      console.error('[getInternDocuments] Intern not found for user_id:', req.user.id);
      return res.status(404).json({ message: 'Intern not found' });
    }

    console.log('[getInternDocuments] Found intern:', intern.id);

    // ✅ Get ALL documents for intern (multiple rows, one per document type)
    const docsList = await InternDocuments.findAll({
      where: { intern_id: intern.id },
      order: [['uploaded_date', 'DESC']],
    });

    console.log('[getInternDocuments] Found', docsList.length, 'document(s) for intern', intern.id);
    docsList.forEach((doc, idx) => {
      console.log(`  [${idx}] ${doc.document_type} - ${doc.file_name}`);
    });

    // Transform array to object keyed by document_type for easier frontend use
    const docsObject = {};
    docsList.forEach(doc => {
      docsObject[doc.document_type] = {
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        uploaded_date: doc.uploaded_date,
        status: doc.status,
        remarks: doc.remarks,
      };
    });

    // Build legacy top-level mapping (keeps older frontend working)
    const legacy = {};
    const validColumns = ['consent_form','notarized_agreement','resume','cor','insurance','medical_cert'];
    validColumns.forEach(col => {
      legacy[col] = docsObject[col] ? docsObject[col].file_path : null;
    });

    // Also expose MOA at top-level for backward compatibility
    legacy.MOA = intern.company?.moaFile || null;

    return res.json({
      documents: docsObject,
      ...legacy,
    });
  } catch (err) {
    console.error('❌ GET INTERN DOCS ERROR:', err.message);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({ 
      message: 'Failed to fetch documents',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

/* =========================
   DELETE INTERN DOCUMENT
========================= */
// DELETE /api/auth/intern-docs/:column
async function deleteInternDoc(req, res) {
  try {
    const { column } = req.params;

    if (column === 'MOA') {
      return res.status(403).json({
        message: 'MOA cannot be deleted by interns',
      });
    }

    const allowedColumns = ['consent_form', 'notarized_agreement', 'resume', 'cor', 'insurance', 'medical_cert'];

    if (!allowedColumns.includes(column)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Find document by intern_id and document_type
    const doc = await InternDocuments.findOne({
      where: { 
        intern_id: intern.id,
        document_type: column
      },
    });

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete the physical file
    const filePath = path.join(__dirname, '..', 'uploads', doc.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('✅ File deleted:', filePath);
    }

    // Delete the database record
    await doc.destroy();
    console.log('✅ Database record deleted:', doc.id);

    return res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('❌ DELETE INTERN DOC ERROR:', err);
    return res.status(500).json({ message: 'Failed to delete document' });
  }
}

/* =========================
   VIEW DOCUMENT (inline in browser)
========================= */
// GET /api/auth/intern-docs/view/:docId
async function viewInternDoc(req, res) {
  try {
    const { docId } = req.params;

    console.log('[viewInternDoc] Requesting doc ID:', docId, 'by user:', req.user.id, 'role:', req.user.role);

    // Find the document
    const doc = await InternDocuments.findOne({
      where: { id: docId },
    });

    if (!doc) {
      console.warn('[viewInternDoc] Document not found:', docId);
      return res.status(404).json({ message: 'Document not found' });
    }

    // ✅ Verify access: Allow interns to view their own docs OR advisers to view assigned intern docs
    let hasAccess = false;
    const intern = await Intern.findByPk(doc.intern_id);
    
    if (!intern) {
      console.warn('[viewInternDoc] Intern not found for doc:', docId);
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Case 1: Intern viewing their own document
    if (intern.user_id === req.user.id) {
      hasAccess = true;
      console.log('[viewInternDoc] Access granted: Intern viewing own document');
    }
    // Case 2: Adviser viewing assigned intern's document
    else if (req.user.role === 'adviser' && intern.adviser_id === req.user.id) {
      hasAccess = true;
      console.log('[viewInternDoc] Access granted: Adviser viewing assigned intern document');
    }
    // Case 3: Coordinator/admin has access to all
    else if (req.user.role === 'coordinator' || req.user.role === 'superadmin') {
      hasAccess = true;
      console.log('[viewInternDoc] Access granted: Coordinator/admin viewing document');
    }

    if (!hasAccess) {
      console.warn('[viewInternDoc] Unauthorized access attempt for doc:', docId, 'by user:', req.user.id);
      return res.status(403).json({ message: 'Access denied' });
    }

    // Try to find the file with fallbacks
    let actualFilePath = null;
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    let filePath = path.join(uploadsDir, doc.file_path);
    if (fs.existsSync(filePath)) {
      actualFilePath = filePath;
    } else {
      filePath = path.join(uploadsDir, doc.file_name);
      if (fs.existsSync(filePath)) {
        actualFilePath = filePath;
      } else {
        const uploads = fs.readdirSync(uploadsDir);
        const docNameBase = path.basename(doc.file_name, path.extname(doc.file_name));
        const ext = path.extname(doc.file_name);
        const found = uploads.find(f => f.includes(docNameBase) && f.endsWith(ext));
        if (found) {
          actualFilePath = path.join(uploadsDir, found);
        }
      }
    }

    if (!actualFilePath) {
      console.error('[viewInternDoc] File not found:', doc.file_path);
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Determine content type based on file extension
    const ext = path.extname(actualFilePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    }

    // Set headers to display inline instead of download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream the file
    const fileStream = fs.createReadStream(actualFilePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('[viewInternDoc] Stream error:', err.message);
      res.status(500).json({ message: 'Error viewing file' });
    });

    console.log('✅ Document view started:', doc.file_name);
  } catch (err) {
    console.error('❌ VIEW INTERN DOC ERROR:', err.message);
    return res.status(500).json({
      message: 'Failed to view document',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

/* =========================
   DOWNLOAD DOCUMENT (force download)
========================= */
// GET /api/auth/intern-docs/download/:docId
async function downloadInternDoc(req, res) {
  try {
    const { docId } = req.params;

    console.log('[downloadInternDoc] Requesting doc ID:', docId, 'by user:', req.user.id);

    // Find the document
    const doc = await InternDocuments.findOne({
      where: { id: docId },
    });

    if (!doc) {
      console.warn('[downloadInternDoc] Document not found:', docId);
      return res.status(404).json({ message: 'Document not found' });
    }

    // ✅ Verify access: Allow interns to download their own docs OR advisers to download assigned intern docs
    let hasAccess = false;
    const intern = await Intern.findByPk(doc.intern_id);
    
    if (!intern) {
      console.warn('[downloadInternDoc] Intern not found for doc:', docId);
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Case 1: Intern downloading their own document
    if (intern.user_id === req.user.id) {
      hasAccess = true;
      console.log('[downloadInternDoc] Access granted: Intern downloading own document');
    }
    // Case 2: Adviser downloading assigned intern's document
    else if (req.user.role === 'adviser' && intern.adviser_id === req.user.id) {
      hasAccess = true;
      console.log('[downloadInternDoc] Access granted: Adviser downloading assigned intern document');
    }
    // Case 3: Coordinator/admin has access to all
    else if (req.user.role === 'coordinator' || req.user.role === 'superadmin') {
      hasAccess = true;
      console.log('[downloadInternDoc] Access granted: Coordinator/admin downloading document');
    }

    if (!hasAccess) {
      console.warn('[downloadInternDoc] Unauthorized access attempt for doc:', docId, 'by user:', req.user.id);
      return res.status(403).json({ message: 'Access denied - you cannot view this document' });
    }

    // Try to find the file - check multiple possible paths for backward compatibility
    let actualFilePath = null;
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // Primary path: use file_path from database
    let filePath = path.join(uploadsDir, doc.file_path);
    console.log('[downloadInternDoc] Primary path:', filePath, 'exists:', fs.existsSync(filePath));
    
    if (fs.existsSync(filePath)) {
      actualFilePath = filePath;
    } else {
      // Fallback: try using file_name (for old/migrated data)
      filePath = path.join(uploadsDir, doc.file_name);
      console.log('[downloadInternDoc] Fallback path:', filePath, 'exists:', fs.existsSync(filePath));
      if (fs.existsSync(filePath)) {
        actualFilePath = filePath;
      } else {
        // Last resort: search for files with similar naming pattern
        console.warn('[downloadInternDoc] Attempting to find file by pattern...');
        const uploads = fs.readdirSync(uploadsDir);
        const docNameBase = path.basename(doc.file_name, path.extname(doc.file_name));
        const ext = path.extname(doc.file_name);
        const found = uploads.find(f => f.includes(docNameBase) && f.endsWith(ext));
        
        if (found) {
          actualFilePath = path.join(uploadsDir, found);
          console.log('[downloadInternDoc] Found by pattern:', found);
        }
      }
    }

    if (!actualFilePath) {
      console.error('[downloadInternDoc] File does not exist on disk. file_path:', doc.file_path, 'file_name:', doc.file_name);
      return res.status(404).json({ 
        message: 'File not found on server',
        details: process.env.NODE_ENV === 'development' ? { stored_path: doc.file_path, file_name: doc.file_name } : undefined
      });
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);

    // Stream the file
    const fileStream = fs.createReadStream(actualFilePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('[downloadInternDoc] Stream error:', err.message);
      res.status(500).json({ message: 'Error downloading file' });
    });

    console.log('✅ Document download started:', doc.file_name);
  } catch (err) {
    console.error('❌ DOWNLOAD INTERN DOC ERROR:', err.message);
    return res.status(500).json({
      message: 'Failed to download document',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

module.exports = {
  uploadInternDoc,
  getInternDocuments,
  deleteInternDoc,
  viewInternDoc,
  downloadInternDoc,
};
