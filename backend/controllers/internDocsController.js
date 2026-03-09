/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');

const { Intern, Company, InternDocuments, User } = require('../models');

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
    console.log('📤 [UPLOAD] req.file:', file ? { filename: file.filename, originalname: file.originalname, size: file.size } : 'MISSING');

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

    const validColumns = ['notarized_agreement', 'medical_cert', 'insurance', 'resume', 'cor', 'consent_form'];
    if (!validColumns.includes(targetColumn)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    /* =========================
       DELETE OLD FILE CONTENT (NOT NEEDED FOR MEMORY STORAGE)
    ========================= */
    const existingDoc = await InternDocuments.findOne({
      where: { intern_id: intern.id, document_type: targetColumn },
    });

    // No need to delete old files from filesystem since we're using memory storage
    // Database update will automatically replace old content

    /* =========================
       CREATE OR UPDATE DOC RECORD
    ========================= */
    console.log('📝 [SAVE] Will save to DB:', {
      intern_id: intern.id,
      document_type: targetColumn,
      file_name: file.originalname,
      file_path: file.filename,
      file_size: file.size,
    });

    // Read file content for database storage
    let fileContent = null;
    let fileMimeType = 'application/octet-stream';
    
    try {
      // Get file content from buffer (memory storage)
      fileContent = file.buffer;
      
      // Determine MIME type from file extension
      const ext = path.extname(file.originalname).toLowerCase();
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
      fileMimeType = mimeTypes[ext] || 'application/octet-stream';
      
      console.log('📁 [FILE CONTENT] Got file from buffer:', {
        size: fileContent.length,
        mimeType: fileMimeType,
      });
    } catch (fileReadErr) {
      console.error('❌ Failed to process file:', fileReadErr.message);
      return res.status(400).json({ message: 'Failed to process file: ' + fileReadErr.message });
    }

    const docData = {
      intern_id: intern.id,
      document_type: targetColumn,
      file_name: file.originalname,
      file_path: file.originalname, // Just use original filename for reference
      file_content: fileContent,
      file_mime_type: fileMimeType,
      uploaded_date: new Date(),
      status: 'Pending',
    };

    console.log('💾 [SAVE DATA] Saving document with:', docData);

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

    // Verify file exists on disk
    const filePath = path.join(__dirname, '..', 'uploads', verifyDoc.file_path);
    const fileExists = fs.existsSync(filePath);
    console.log('📁 [FILE CHECK]', filePath, '→', fileExists ? '✅ EXISTS' : '❌ NOT FOUND');

    if (!fileExists) {
      console.error('❌ CRITICAL: File was not saved to disk!', filePath);
      return res.status(500).json({
        message: 'Document uploaded successfully',
        error: 'File system error',
        debug: { expected_path: filePath, db_file_path: verifyDoc.file_path }
      });
    }

    console.log('✅ Document verified in database:', {
      id: verifyDoc.id,
      intern_id: verifyDoc.intern_id,
      document_type: verifyDoc.document_type,
      file_path: verifyDoc.file_path,
      multer_filename: file.filename,
      match: file.filename === verifyDoc.file_path ? '✅ MATCH' : '❌ MISMATCH',
    });

    return res.json({
      message: 'Document uploaded successfully',
      file: verifyDoc.file_path,
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
   GET INTERN DOCUMENTS (for self)
========================= */
// GET /api/documents/intern-docs/me
async function getInternDocuments(req, res) {
  try {
    console.log('[getInternDocuments] Fetching for user_id:', req.user.id);
    
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['moaFile_content', 'moaFile_mime_type'],
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
    // ✅ For MOA: check if moaFile_content exists in the company
    const docsObject = {
      MOA: intern.company?.moaFile_content ? 'MOA' : null,
    };
    docsList.forEach(doc => {
      docsObject[doc.document_type] = doc.file_content ? doc.file_name : null;
    });

    return res.json(docsObject);
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
   GET ADVISER'S INTERN DOCUMENTS (NEW)
========================= */
// GET /api/documents/adviser/intern-docs/:internId
// Allows adviser/coordinator to fetch all documents for their assigned interns
async function getAdviserInternDocuments(req, res) {
  try {
    const { internId } = req.params;
    const user = req.user;

    console.log('\n\n🔍 [getAdviserInternDocuments] ========== REQUEST ==========');
    console.log('[getAdviserInternDocuments] User:', { id: user.id, role: user.role, program: user.program, yearSection: user.yearSection });
    console.log('[getAdviserInternDocuments] Requested internId:', internId);

    // ✅ AUTHORIZATION: Only advisers, coordinators, and superadmins can access
    const allowedRoles = ['adviser', 'coordinator', 'superadmin'];
    if (!allowedRoles.includes(user.role?.toLowerCase())) {
      console.error('[getAdviserInternDocuments] User role not allowed:', user.role);
      return res.status(403).json({ 
        message: 'You do not have permission to view intern documents' 
      });
    }

    // Get the intern with relationships
    const intern = await Intern.findByPk(internId, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstName', 'lastName', 'email', 'program', 'yearSection'],
        },
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'moaFile'],
        },
      ],
    });

    if (!intern) {
      console.error('[getAdviserInternDocuments] Intern not found:', internId);
      return res.status(404).json({ message: 'Intern not found' });
    }

    // ✅ AUTHORIZATION CHECK: Verify adviser is assigned to this intern
    if (user.role?.toLowerCase() === 'adviser') {
      const isDirectlyAssigned = intern.adviser_id === user.id;
      const isProgramMatch = user.program && intern.program && user.program === intern.program;
      
      // Normalize yearSection comparison (remove spaces, lowercase)
      let isYearSectionMatch = false;
      if (user.yearSection && intern.year_section) {
        const normalizedAdviserYearSection = (user.yearSection || '').replace(/\s/g, '').toLowerCase();
        const normalizedInternYearSection = (intern.year_section || '').replace(/\s/g, '').toLowerCase();
        isYearSectionMatch = normalizedAdviserYearSection === normalizedInternYearSection;
      }
      
      const isProgramAndYearMatch = isProgramMatch && isYearSectionMatch;
      
      if (!isDirectlyAssigned && !isProgramAndYearMatch) {
        console.error('[getAdviserInternDocuments] Adviser not authorized for this intern', {
          adviserId: user.id,
          internAdviserId: intern.adviser_id,
          adviserProgram: user.program,
          internProgram: intern.program,
          adviserYearSection: user.yearSection,
          internYearSection: intern.year_section,
        });
        return res.status(403).json({ 
          message: 'You are not authorized to access this intern\'s documents' 
        });
      }
    }

    // Get all documents for the intern
    const docsList = await InternDocuments.findAll({
      where: { intern_id: internId },
      order: [['uploaded_date', 'DESC']],
      raw: true,
    });

    console.log('[getAdviserInternDocuments] Found', docsList.length, 'document(s) for intern', internId);

    // Transform to include file status information
    const docsWithStatus = docsList.map(doc => ({
      id: doc.id,
      document_type: doc.document_type,
      file_name: doc.file_name,
      status: doc.status,
      uploaded_date: doc.uploaded_date,
      remarks: doc.remarks,
      // Check file availability (database or filesystem)
      has_file_content: !!(doc.file_content && doc.file_content.length > 0),
      has_file_path: !!doc.file_path,
      file_size: doc.file_content ? doc.file_content.length : 0,
      file_mime_type: doc.file_mime_type || 'application/octet-stream',
      storage_location: (doc.file_content && doc.file_content.length > 0) ? 'database' : 'filesystem',
    }));

    // Return comprehensive response
    return res.json({
      success: true,
      intern: {
        id: intern.id,
        name: `${intern.User?.firstName || ''} ${intern.User?.lastName || ''}`,
        email: intern.User?.email,
        program: intern.program,
        year_section: intern.year_section,
        status: intern.status,
        adviser_id: intern.adviser_id,
        company_id: intern.company_id,
        company_name: intern.company?.name,
      },
      documents: docsWithStatus,
      moa: intern.company?.moaFile || null,
      summary: {
        total_documents: docsList.length,
        submitted_count: docsWithStatus.filter(d => d.has_file_content || d.has_file_path).length,
        pending_count: docsWithStatus.filter(d => !d.has_file_content && !d.has_file_path).length,
      },
    });
  } catch (err) {
    console.error('❌ GET ADVISER INTERN DOCS ERROR:', err.message);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({
      message: 'Failed to fetch intern documents',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

/* =========================
   DOWNLOAD OWN DOCUMENT (INTERN)
========================= */
// GET /api/auth/intern-docs/download/own/:docColumn
async function downloadOwnInternDoc(req, res) {
  try {
    const { docColumn } = req.params;
    const userId = req.user.id;

    console.log('[downloadOwnInternDoc] Intern requesting own document:', { userId, docColumn });

    // Get the intern
    const intern = await Intern.findOne({
      where: { user_id: userId },
    });

    if (!intern) {
      console.error('[downloadOwnInternDoc] Intern not found for user_id:', userId);
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Get the document
    const doc = await InternDocuments.findOne({
      where: { intern_id: intern.id, document_type: docColumn },
    });

    if (!doc) {
      console.error('[downloadOwnInternDoc] Document not found:', { internId: intern.id, docColumn });
      return res.status(404).json({ message: 'Document not found' });
    }

    // Serve from database
    if (doc.file_content && doc.file_content.length > 0) {
      console.log('[downloadOwnInternDoc] ✅ Serving from database:', { size: doc.file_content.length });
      
      const mimeType = doc.file_mime_type || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
      res.setHeader('Content-Length', doc.file_content.length);
      
      return res.send(doc.file_content);
    }

    console.error('[downloadOwnInternDoc] No file content in database');
    return res.status(404).json({ message: 'Document file is empty' });
  } catch (err) {
    console.error('[downloadOwnInternDoc] Error:', err.message);
    res.status(500).json({ message: 'Failed to download document' });
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

    const doc = await InternDocuments.findOne({
      where: { intern_id: intern.id, document_type: column },
    });

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete the file from disk
    if (doc.file_path) {
      const filePath = path.join(__dirname, '..', 'uploads', doc.file_path);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('✅ Deleted file:', doc.file_path);
        } catch (err) {
          console.warn('⚠️ Failed to delete file from disk:', err.message);
        }
      }
    }

    // Delete the database record
    await doc.destroy();

    return res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('❌ DELETE INTERN DOC ERROR:', err);
    return res.status(500).json({ message: 'Failed to delete document' });
  }
}

/* =========================
   GET INTERN DOCUMENT (For Adviser/Admin viewing)
========================= */
// GET /api/documents/intern-docs/download/:internId/:documentType
async function downloadInternDoc(req, res) {
  try {
    const { internId, documentType } = req.params;
    const user = req.user;

    console.log('\n\n🔍 [downloadInternDoc] ========== DOWNLOAD REQUEST ==========');
    console.log('[downloadInternDoc] User:', { id: user.id, role: user.role, program: user.program, yearSection: user.yearSection });
    console.log('[downloadInternDoc] Requested:', { internId, documentType });

    // Verify user is authorized
    let isAuthorized = false;

    if (user.role === 'intern') {
      // Interns can only view their own documents
      const intern = await Intern.findOne({ where: { user_id: user.id } });
      isAuthorized = intern && intern.id.toString() === internId.toString();
      
      if (!isAuthorized) {
        console.error('[downloadInternDoc] Intern trying to access another intern\'s documents:', { userId: user.id, targetInternId: internId });
        return res.status(403).json({ message: 'You can only view your own documents' });
      }
    } else if (['adviser', 'coordinator', 'superadmin'].includes(user.role)) {
      // Advisers, coordinators and superadmin can view any intern's documents
      isAuthorized = true;
    }

    if (!isAuthorized) {
      console.error('[downloadInternDoc] User role not allowed:', user.role);
      return res.status(403).json({ message: 'You do not have permission to view this document' });
    }

    // Get the intern
    const intern = await Intern.findByPk(internId);
    if (!intern) {
      console.error('[downloadInternDoc] Intern not found:', internId);
      return res.status(404).json({ message: 'Intern not found' });
    }

    // If user is adviser, verify they're assigned to this intern
    if (user.role === 'adviser') {
      // Check if directly assigned via adviser_id OR matching program + yearSection
      const isDirectlyAssigned = intern.adviser_id === user.id;
      const isProgramMatch = user.program && intern.program && user.program === intern.program;
      
      // ✅ FIXED: Normalize yearSection comparison (remove spaces, convert to lowercase)
      // This matches the logic in adviserController.getMatchingInterns()
      let isYearSectionMatch = false;
      if (user.yearSection && intern.year_section) {
        const normalizedAdviserYearSection = (user.yearSection || '').replace(/\s/g, '').toLowerCase();
        const normalizedInternYearSection = (intern.year_section || '').replace(/\s/g, '').toLowerCase();
        isYearSectionMatch = normalizedAdviserYearSection === normalizedInternYearSection;
      }
      
      const isProgramAndYearMatch = isProgramMatch && isYearSectionMatch;
      
      if (!isDirectlyAssigned && !isProgramAndYearMatch) {
        console.error('[downloadInternDoc] Adviser not authorized for intern', {
          adviserId: user.id,
          internAdvertiserId: intern.adviser_id,
          adviserProgram: user.program,
          internProgram: intern.program,
          adviserYearSection: user.yearSection,
          normalizedAdviserYearSection: (user.yearSection || '').replace(/\s/g, '').toLowerCase(),
          internYearSection: intern.year_section,
          normalizedInternYearSection: (intern.year_section || '').replace(/\s/g, '').toLowerCase(),
        });
        return res.status(403).json({ message: 'You are not authorized to access this intern\'s documents' });
      }
    }

    // Get the document
    const doc = await InternDocuments.findOne({
      where: { intern_id: internId, document_type: documentType },
    });

    if (!doc) {
      console.error('[downloadInternDoc] Document record not found:', { internId, documentType });
      return res.status(404).json({ message: 'Document not found' });
    }

    // ✅ NEW: First try to serve from database (persistent across redeployments)
    if (doc.file_content && doc.file_content.length > 0) {
      console.log('[downloadInternDoc] 📦 Serving file from DATABASE');
      
      const mimeType = doc.file_mime_type || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);  // 'inline' = open in browser tab
      res.setHeader('Content-Length', doc.file_content.length);
      
      // Send buffer directly from database
      res.send(doc.file_content);
      return;
    }

    // 🔄 FALLBACK: Try filesystem if database storage not available
    console.log('[downloadInternDoc] Database content not found, trying filesystem fallback...');
    
    if (!doc.file_path) {
      console.error('[downloadInternDoc] No file content in DB and no file_path for filesystem:', { internId, documentType });
      return res.status(404).json({ message: 'Document file not found' });
    }

    // Build file path - handle both absolute and relative paths
    let filePath = doc.file_path;
    if (!filePath.includes(path.sep) && !filePath.startsWith('/')) {
      // If it's just a filename, construct the full path
      filePath = path.join(__dirname, '..', 'uploads', filePath);
    } else if (!path.isAbsolute(filePath)) {
      // If it's a relative path but not just a filename
      filePath = path.join(__dirname, '..', filePath);
    }

    // Security: Normalize and verify the path is within uploads directory
    const uploadsDir = path.normalize(path.join(__dirname, '..', 'uploads'));
    const normalizedPath = path.normalize(filePath);
    
    if (!normalizedPath.startsWith(uploadsDir)) {
      console.error('[downloadInternDoc] Path traversal attempt detected:', normalizedPath);
      return res.status(400).json({ message: 'Invalid file path' });
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      console.error('[downloadInternDoc] File does not exist:', normalizedPath);
      console.log('[downloadInternDoc] Stored path in DB:', doc.file_path);
      
      // Try to find actual file in uploads directory
      const uploadsPath = path.join(__dirname, '..', 'uploads');
      let recoveredFile = null;
      
      try {
        const files = fs.readdirSync(uploadsPath);
        
        // Pattern 1: Look for files matching intern lastname + document type
        const internUser = await Intern.findByPk(internId, { include: [{ model: User, as: 'User' }] });
        const internLastName = internUser?.User?.lastName?.toUpperCase() || '';
        const docTypeUpper = documentType.toUpperCase();
        
        if (internLastName && docTypeUpper) {
          recoveredFile = files.find(f => 
            f.toUpperCase().includes(internLastName) && 
            f.toUpperCase().includes(docTypeUpper)
          );
          if (recoveredFile) {
            console.log('[downloadInternDoc] Found matching file by name pattern:', recoveredFile);
            normalizedPath = path.join(uploadsPath, recoveredFile);
            // Update database with correct path for next time
            doc.file_path = recoveredFile;
            await doc.save().catch(e => console.warn('Could not update DB with recovered path:', e.message));
          }
        }
        
        // Pattern 2: If no match, try document type only (last resort)
        if (!recoveredFile && docTypeUpper) {
          recoveredFile = files.find(f => f.toUpperCase().includes(docTypeUpper));
          if (recoveredFile) {
            console.log('[downloadInternDoc] Found file by document type pattern:', recoveredFile);
            normalizedPath = path.join(uploadsPath, recoveredFile);
            doc.file_path = recoveredFile;
            await doc.save().catch(e => console.warn('Could not update DB with recovered path:', e.message));
          }
        }
        
        if (!recoveredFile) {
          const possibleMatches = files.filter(f => 
            f.toLowerCase().includes(documentType.toLowerCase()) ||
            (internUser?.User?.lastName && f.toLowerCase().includes(internUser.User.lastName.toLowerCase()))
          );
          
          console.log('[downloadInternDoc] No matching file found. Possible matches:', possibleMatches.slice(0, 10));
          
          return res.status(404).json({ 
            message: 'Document file not found on server',
            storedPath: doc.file_path,
            suggestedFiles: possibleMatches.slice(0, 5)
          });
        }
      } catch (readErr) {
        console.error('[downloadInternDoc] Error searching for file:', readErr.message);
        return res.status(404).json({ 
          message: 'Document file not found and recovery failed'
        });
      }
      
      // Verify recovered file exists before continuing
      if (!fs.existsSync(normalizedPath)) {
        console.error('[downloadInternDoc] Recovered file also does not exist:', normalizedPath);
        return res.status(404).json({ 
          message: 'Document file not found'
        });
      }
    }

    console.log('[downloadInternDoc] Serving file:', normalizedPath);

    // Serve the file from filesystem
    res.download(normalizedPath, doc.file_name, (err) => {
      if (err) {
        console.error('[downloadInternDoc] Error downloading file:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error downloading document' });
        }
      }
    });
  } catch (err) {
    console.error('❌ DOWNLOAD INTERN DOC ERROR:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).json({
      message: 'Failed to download document',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

/* =========================
   VALIDATE INTERN DOCUMENT (Check if file exists)
========================= */
// GET /api/auth/intern-docs/validate/:internId/:documentType
async function validateInternDoc(req, res) {
  try {
    const { internId, documentType } = req.params;
    const user = req.user;

    console.log('[validateInternDoc] Checking:', { internId, documentType });

    // Get the document
    const doc = await InternDocuments.findOne({
      where: { intern_id: internId, document_type: documentType },
    });

    if (!doc) {
      console.log('[validateInternDoc] Document record not found');
      return res.json({ exists: false, hasFile: false, reason: 'Document not in database' });
    }

    // ✅ NEW: Check if file exists in database (takes priority)
    const hasDbContent = doc.file_content && doc.file_content.length > 0;
    
    if (hasDbContent) {
      console.log('[validateInternDoc] File found in DATABASE');
      return res.json({
        exists: true,
        hasFile: true,
        inDatabase: true,
        fileName: doc.file_name,
        status: doc.status,
        uploadedDate: doc.uploaded_date,
        fileSize: doc.file_content.length,
      });
    }

    if (!doc.file_path) {
      console.log('[validateInternDoc] Document record exists but no file_path or database content');
      return res.json({ exists: false, hasFile: false, reason: 'No file path or database content stored' });
    }

    // Build file path
    let filePath = doc.file_path;
    if (!filePath.includes(path.sep) && !filePath.startsWith('/')) {
      filePath = path.join(__dirname, '..', 'uploads', filePath);
    } else if (!path.isAbsolute(filePath)) {
      filePath = path.join(__dirname, '..', filePath);
    }

    const fileExists = fs.existsSync(filePath);
    console.log('[validateInternDoc] File check:', { filePath, exists: fileExists });

    return res.json({
      exists: true,
      hasFile: fileExists,
      inDatabase: false,
      fileName: doc.file_name,
      filePath: doc.file_path,
      status: doc.status,
      uploadedDate: doc.uploaded_date,
    });
  } catch (err) {
    console.error('❌ VALIDATE INTERN DOC ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/* =========================
   SERVE FILE FROM UPLOADS PATH (Database-first, for /uploads/* requests)
========================= */
// This endpoint allows accessing files via /uploads/:filename
// The frontend returns /uploads/filename.pdf, which gets routed here
// We look up the file in the database and serve it if found
async function serveUploadedFile(req, res) {
  try {
    const { filename } = req.params;
    
    console.log('[serveUploadedFile] Request for filename:', filename);
    
    if (!filename) {
      return res.status(400).json({ message: 'Filename required' });
    }
    
    // Find document by file_path
    const doc = await InternDocuments.findOne({
      where: { file_path: filename },
    });
    
    if (!doc) {
      console.error('[serveUploadedFile] Document not found with file_path:', filename);
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if file exists in database
    if (!doc.file_content || doc.file_content.length === 0) {
      console.error('[serveUploadedFile] File content not in database:', filename);
      return res.status(404).json({ message: 'File content not available' });
    }
    
    // Serve from database
    const mimeType = doc.file_mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);  // 'inline' = open in browser
    res.setHeader('Content-Length', doc.file_content.length);
    
    console.log('[serveUploadedFile] ✅ Serving from database:', {
      filename: filename,
      originalName: doc.file_name,
      mimeType: mimeType,
      size: doc.file_content.length,
    });
    
    res.send(doc.file_content);
    return;
  } catch (err) {
    console.error('❌ SERVE UPLOADED FILE ERROR:', err.message);
    res.status(500).json({
      message: 'Failed to serve file',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

module.exports = {
  uploadInternDoc,
  getInternDocuments,
  getAdviserInternDocuments,
  serveUploadedFile,
  deleteInternDoc,
  downloadInternDoc,
  downloadOwnInternDoc,
  validateInternDoc,
};
